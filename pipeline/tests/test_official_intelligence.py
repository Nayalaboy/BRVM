from datetime import date

from brvm_pipeline.collectors.official_intelligence import (
    OfficialSource,
    discover_links,
    parse_publication_date,
    source_country,
)


def test_discovers_only_matching_same_host_official_links() -> None:
    source = OfficialSource(
        key="ci",
        listing_url="https://gouv.example/publications",
        country="CI",
        body="Conseil des ministres",
        doc_type="council_communication",
        link_pattern=r"conseil|\.pdf",
        path_pattern=r"/conseil/",
    )
    html = """
      <a href="/conseil/24-juillet-2026">Conseil des ministres du 24 juillet 2026</a>
      <a href="https://outside.example/conseil.pdf">Copie externe</a>
      <a href="/sports">Actualités sportives</a>
    """
    links = discover_links(html, source)
    assert links == [
        (
            "https://gouv.example/conseil/24-juillet-2026",
            "Conseil des ministres du 24 juillet 2026",
            date(2026, 7, 24),
        )
    ]


def test_parses_french_publication_dates() -> None:
    assert parse_publication_date("Communiqué du 05 juin 2026") == date(2026, 6, 5)
    assert parse_publication_date("Décision du 12 août 2025") == date(2025, 8, 12)
    assert parse_publication_date("20260710_-_avis.pdf") == date(2026, 7, 10)
    assert parse_publication_date("Conseil du 1er juillet 2026") == date(2026, 7, 1)


def test_derives_country_for_umoa_titres_issuances() -> None:
    source = OfficialSource("umoa_titres", "https://example.test", None, "UMOA", "issue", "x", "x")
    assert source_country(source, "https://example.test/emission-du-tresor-du-togo/") == "TG"
    assert source_country(source, "https://example.test/emission-guinee-bissau/") == "GW"
