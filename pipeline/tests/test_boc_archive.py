from __future__ import annotations

from datetime import date

from brvm_pipeline.collectors.boc_archive import (
    _document_language,
    canonical_url,
    iter_weekdays,
    parse_archive_links,
    resolve_publication_page,
)


def test_public_archive_discovers_publication_node_and_direct_pdf() -> None:
    html = """
    <main>
      <div>Bulletin Officiel de la Cote du 20 Janvier 2021
        <a href="/fr/bulletin-officiel-de-la-cote-du-20-janvier-2021">
          Télécharger
        </a>
      </div>
      <a href="/sites/default/files/boc_20180516.pdf">BOC 16/05/2018</a>
      <a href="/unrelated">Actualités</a>
    </main>
    """
    links = parse_archive_links(
        html,
        "https://www.brvm.org/fr/bulletins-officiels-de-la-cote",
        "brvm_publications",
    )
    assert len(links) == 2
    by_date = {item.session_date: item for item in links}
    assert by_date[date(2021, 1, 20)].needs_resolution
    assert by_date[date(2018, 5, 16)].source_url.endswith("boc_20180516.pdf")


def test_financial_archive_date_comes_from_parent_context() -> None:
    html = """
    <table><tr><td>22/07/2026</td>
      <td><a href="BOC_JOUR/BOC_20260722.pdf">TELECHARGER</a></td>
    </tr></table>
    """
    [item] = parse_archive_links(
        html,
        "https://bfin.brvm.org/boc/boc_jour.aspx",
        "brvm_financial_database",
    )
    assert item.session_date == date(2026, 7, 22)
    assert item.source_url == "https://bfin.brvm.org/boc/BOC_JOUR/BOC_20260722.pdf"


def test_publication_page_inherits_listing_date() -> None:
    listing_html = """
    <div>Bulletin Officiel de la Cote du 20 Janvier 2021
      <a href="/fr/node/123">Télécharger</a>
    </div>
    """
    [fallback] = parse_archive_links(
        listing_html, "https://www.brvm.org/fr/bulletins-officiels-de-la-cote", "brvm"
    )
    resolved = resolve_publication_page(
        '<a href="/sites/default/files/boc_unknown.pdf">application/pdf</a>',
        fallback.source_url,
        fallback.source,
        fallback,
    )
    assert resolved[0].session_date == date(2021, 1, 20)
    assert not resolved[0].needs_resolution


def test_canonical_url_removes_fragment_but_keeps_query() -> None:
    assert (
        canonical_url("HTTPS://WWW.BRVM.ORG/fr/node/1?download=1#file")
        == "https://www.brvm.org/fr/node/1?download=1"
    )


def test_document_language_from_official_filename() -> None:
    assert _document_language("https://brvm.org/files/boc_eng_20251231_2.pdf") == "en"
    assert _document_language("https://brvm.org/files/boc_20251231_2.pdf") == "fr"


def test_weekday_candidates_exclude_weekends() -> None:
    assert list(iter_weekdays(date(2015, 1, 2), date(2015, 1, 6))) == [
        date(2015, 1, 2),
        date(2015, 1, 5),
        date(2015, 1, 6),
    ]
