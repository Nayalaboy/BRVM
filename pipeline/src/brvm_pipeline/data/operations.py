"""Curated primary-market operations (IPOs / APEs / bond issues).

Primary-market data — subscription windows, prices, minimums, tranche
eligibility — is regulated and must be verified against the official *note
d'information* before publication. It is therefore human-curated here (not
scraped/guessed), reviewed on each change, and version-controlled. The
operations collector upserts these into `primary_operations`.

To add an operation: copy the template below, fill every field from the
official note d'information, set `notice_url` to that document, and open a PR.
Leave this list empty rather than publishing an unverified operation.

Schema (see models.PrimaryOperation):
    issuer_name, operation_type (ipo|ape|opv|bond), title, status
    (announced|open|closed|settled|cancelled), open_date, close_date (ISO),
    price_min, price_max, min_subscription, tranches [{name, eligibility}],
    eligibility_notes_fr, sgi_lead, notice_url, source_url

Template (do not ship — replace with a verified operation):
    {
        "issuer_name": "…",
        "operation_type": "ipo",
        "title": "…",
        "status": "announced",
        "open_date": "2026-01-01",
        "close_date": "2026-01-31",
        "price_min": 10000, "price_max": 10000,
        "min_subscription": 100000,
        "tranches": [{"name": "Tranche A — particuliers", "eligibility": "…"}],
        "eligibility_notes_fr": "Explication en français simple des conditions.",
        "sgi_lead": "…",
        "notice_url": "https://…note-d-information.pdf",
        "source_url": "https://www.brvm.org/…",
    }
"""

from __future__ import annotations

OPERATIONS: list[dict] = [
    # Intentionally empty until an operation is verified against its official
    # note d'information (see module docstring). /operations returns [] safely.
]
