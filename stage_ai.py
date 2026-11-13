"""Auto-stage: reads each owner's Instantly conversation with Issac and moves the
seller deal to the stage the emails prove. Forward-only (never undoes a manual move),
or marks lost. Each move is logged on the card's timeline with a one-line reason.

Only threads with a NEW email since the last check are sent to the AI (state in
stage_state.json), so a 2-minute schedule costs almost nothing.

  python stage_ai.py            # live
  python stage_ai.py --dry      # decide + print, write nothing
  python stage_ai.py --dump F   # write the threads to F (no AI, no writes)
"""
import json, os, re, sys, time, urllib.request, urllib.parse, urllib.error
from datetime import datetime, timezone
from pathlib import Path

DRY = "--dry" in sys.argv
DUMP = sys.argv[sys.argv.index("--dump") + 1] if "--dump" in sys.argv else None
STATE = Path(__file__).with_name("stage_state.json")
MAX_AI = int(os.getenv("STAGE_AI_MAX", "25"))
SB, SBK = os.environ["SUPABASE_URL"].rstrip("/"), os.environ["SUPABASE_SERVICE_ROLE_KEY"]
INST = os.environ["INSTANTLY_API_KEY"]

STAGES = {  # name: what the emails must show
    "Interested": "Owner replied with interest; no call time agreed yet.",
    "Discovery Call Booked": "A specific day/time for a call or meeting is agreed, or a calendar invite was accepted.",
    "Discovery Call Held": "The emails show the call/meeting already happened (e.g. 'great speaking with you', 'as discussed').",
    "Seller Qualified": "After the call the owner confirmed they want to sell or explore a sale, with motivation or a timeline.",
    "Documents Requested": "Issac asked for financials (P&L, rent roll, tax returns, leases) and/or the owner is sending them.",
    "Site Visit Completed": "A site visit / property tour took place.",
    "Valuation in Progress": "Issac is preparing an opinion of value / BOV.",
    "Valuation Presented": "The valuation was sent or presented to the owner.",
    "Listing Agreement Sent": "The listing agreement was sent for signature.",
    "Listing Agreement Signed": "The owner signed the listing agreement.",
    "Listing Live": "The property is listed / on market.",
}
ORDER = list(STAGES)


def http(url, headers, body=None, method=None):
    req = urllib.request.Request(url, json.dumps(body).encode() if body is not None else None,
                                 headers, method=method or ("POST" if body is not None else "GET"))
    with urllib.request.urlopen(req, timeout=90) as r:
        t = r.read()
        return json.loads(t) if t else None


def sb(method, path, body=None):
    h = {"apikey": SBK, "Authorization": "Bearer " + SBK, "Content-Type": "application/json", "Prefer": "return=minimal"}
    return http(f"{SB}/rest/v1/{path}", h, body, method)


def inst(q):
    h = {"Authorization": "Bearer " + INST, "User-Agent": "Mozilla/5.0", "Accept": "application/json"}
    for i in range(5):
        try:
            return http("https://api.instantly.ai/api/v2/emails?" + q, h)
        except urllib.error.HTTPError as e:
            if e.code != 429 or i == 4:
                raise
            time.sleep(int(e.headers.get("Retry-After") or 0) or 12 * (i + 1))


def thread(email):
    j = inst("limit=30&lead=" + urllib.parse.quote(email))
    return sorted(j.get("items", []), key=lambda x: x.get("timestamp_email") or "")


def latest_by_lead():
    """One cheap call: newest emails across all campaigns → {lead: newest email id}."""
    out = {}
    for x in inst("limit=100").get("items", []):
        lead = (x.get("lead") or "").lower()
        if lead and lead not in out:
            out[lead] = x.get("id")
    return out


def clean(txt):
    txt = re.split(r"\n\s*On .{5,120}wrote:|\n-{2,}\s*Original Message|\nFrom: ", txt or "")[0]
    txt = "\n".join(l for l in txt.splitlines() if not l.lstrip().startswith(">"))
    return re.sub(r"\n{3,}", "\n\n", txt).strip()[:1800]


def render(items, owner_email):
    out = []
    for x in items[-14:]:
        who = "OWNER" if x.get("ue_type") == 2 else "ISSAC"  # 2 = received; 1 campaign, 3 sent by hand
        body = clean((x.get("body") or {}).get("text") or re.sub("<[^>]+>", " ", (x.get("body") or {}).get("html") or ""))
        out.append(f"[{(x.get('timestamp_email') or '')[:16]}] {who} — {x.get('subject') or ''}\n{body or '(no text)'}")
    return "\n\n".join(out)


def ask_ai(name, company, cur, convo):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d (%A)")
    stages = "\n".join(f"{i+1}. {n}: {d}" for i, (n, d) in enumerate(STAGES.items()))
    prompt = f"""You update a commercial real-estate broker's CRM. Broker: Issac Newton (eXp Commercial, Texas).
Owner: {name} ({company}). Current stage: {cur}. Today: {today}.

Seller pipeline stages, in order:
{stages}

Read the email conversation and decide the stage the emails PROVE. Be conservative: if unsure, keep the current stage.
Mark lost only if the owner clearly declined (not interested / sold already / stop emailing / wrong person).
If a concrete next step exists (call time, documents to send, follow-up date), give it.

Conversation (oldest first):
{convo}

Reply with JSON only:
{{"stage": "<exact stage name>", "lost": false, "lost_reason": null, "next_action": "<short, or null>", "next_action_at": "<ISO 8601 with timezone, or null>", "why": "<one short line quoting the evidence>"}}"""
    if os.getenv("GEMINI_API_KEY"):
        err = None
        models = os.getenv("STAGE_AI_MODELS", "gemini-3.8-flash,gemini-3.7-flash,gemini-3.5-flash,gemini-flash-latest,gemini-3.5-flash-lite,gemini-flash-lite-latest").split(",")
        for k, m in enumerate(models * 2):
            if k and k % len(models) == 0:
                time.sleep(20)  # free tier busy → wait, one more round
            try:  # busy / daily free limit (20 per model) hit → next model
                j = http(f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent",
                         {"x-goog-api-key": os.environ["GEMINI_API_KEY"], "Content-Type": "application/json"},
                         {"contents": [{"parts": [{"text": prompt}]}],
                          "generationConfig": {"temperature": 0, "responseMimeType": "application/json"}})
                text = j["candidates"][0]["content"]["parts"][0]["text"]
                break
            except Exception as e:
                err = e
        else:
            raise err
    elif os.getenv("ANTHROPIC_API_KEY"):
        j = http("https://api.anthropic.com/v1/messages",
                 {"x-api-key": os.environ["ANTHROPIC_API_KEY"], "anthropic-version": "2023-06-01", "content-type": "application/json"},
                 {"model": os.getenv("STAGE_AI_MODEL", "claude-sonnet-5-5"), "max_tokens": 400,
                  "messages": [{"role": "user", "content": prompt}]})
        text = j["content"][0]["text"]
    else:
        j = http("https://openrouter.ai/api/v1/chat/completions",
                 {"Authorization": "Bearer " + os.environ["OPENROUTER_API_KEY"], "Content-Type": "application/json"},
                 {"model": os.getenv("STAGE_AI_MODEL", "anthropic/claude-sonnet-5.5"), "max_tokens": 400,
                  "messages": [{"role": "user", "content": prompt}]})
        text = j["choices"][0]["message"]["content"]
    return json.loads(re.search(r"\{.*\}", text, re.S).group(0))


def main():
    if not (os.getenv("GEMINI_API_KEY") or os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENROUTER_API_KEY")) and not DUMP:
        print("stage_ai: no AI key set — skipped"); return
    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    deals = sb("GET", "deals?select=id,stage,lost_reason,next_action,contact_id,contacts(email,full_name,company)"
                      "&pipeline=eq.seller&lost_reason=is.null")
    dump, calls, moved = [], 0, 0
    recent = {} if DUMP else latest_by_lead()
    for d in deals:
        c = d.get("contacts") or {}
        email = (c.get("email") or "").strip()
        if not email or d["stage"] == ORDER[-1]:
            continue
        if not DUMP and email.lower() in recent and recent[email.lower()] == state.get(d["id"]):
            continue
        if not DUMP and email.lower() not in recent and d["id"] in state:
            continue  # nothing new in the latest 100 emails
        try:
            items = thread(email)
        except Exception as e:
            print("instantly", email, e); continue
        if not items:
            continue
        last = items[-1].get("id")
        if DUMP:
            dump.append({"deal": d["id"], "name": c.get("full_name"), "company": c.get("company"), "stage": d["stage"],
                         "thread": render(items, email)}); continue
        if state.get(d["id"]) == last:
            continue
        if calls >= MAX_AI:
            break
        calls += 1
        if calls > 1:
            time.sleep(int(os.getenv("STAGE_AI_PACE", "6")))  # stay under the free per-minute limit
        try:
            r = ask_ai(c.get("full_name"), c.get("company"), d["stage"], render(items, email))
        except Exception as e:
            print("ai", c.get("full_name"), e); continue
        cur_i = ORDER.index(d["stage"]) if d["stage"] in ORDER else 0
        new = r.get("stage") if r.get("stage") in ORDER else d["stage"]
        patch, note = {}, None
        if r.get("lost"):
            patch["lost_reason"] = (r.get("lost_reason") or "Declined by email")[:200]
            note = f"AI: marked lost — {r.get('why')}"
        elif ORDER.index(new) > cur_i:
            patch["stage"] = new
            note = f"AI: {d['stage']} → {new} — {r.get('why')}"
        if r.get("next_action") and not r.get("lost") and (patch or not d.get("next_action")):
            patch["next_action"] = r["next_action"][:200]
            if r.get("next_action_at"):
                patch["next_action_at"] = r["next_action_at"]
        print(f"{c.get('full_name')[:28]:28} {d['stage'][:22]:22} → {new[:22]:22} {'LOST ' if r.get('lost') else ''}{r.get('why')}")
        if not DRY:
            if patch:
                patch["updated_at"] = datetime.now(timezone.utc).isoformat()
                sb("PATCH", f"deals?id=eq.{d['id']}", patch)
            if note:
                moved += 1
                sb("POST", "activities", {"contact_id": d["contact_id"], "type": "stage_change", "subject": "Stage update",
                                          "body": note[:500], "source": "ai", "ext_id": f"{d['id']}:{last}", "created_by": "AI"})
            state[d["id"]] = last
            STATE.write_text(json.dumps(state, indent=0, sort_keys=True))  # save as we go (a timeout keeps progress)
    if DUMP:
        Path(DUMP).write_text(json.dumps(dump, indent=1)); print("dumped", len(dump)); return
    if not DRY:
        STATE.write_text(json.dumps(state, indent=0, sort_keys=True))
    print(f"checked {calls} new conversations, moved {moved}")


if __name__ == "__main__":
    main()
