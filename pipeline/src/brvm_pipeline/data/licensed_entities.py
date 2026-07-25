"""Seed list of BRVM/CREPMF-licensed SGIs used as a fallback until the weekly
registry collector is pointed at the official CREPMF/BRVM source.

IMPORTANT: this is a conservative, non-exhaustive bootstrap list. The /verifier
feature must not be relied upon for "not found → not licensed" conclusions until
``BRVM_REGISTRY_URL`` is set to the official regulator list and the weekly
collector has run. `status` reflects best-known public information; the
authoritative source is CREPMF (Conseil Régional de l'Épargne Publique et des
Marchés Financiers).
"""

from __future__ import annotations

# (name, country, entity_type, status)
SGIS: list[tuple[str, str, str, str]] = [
    ("BICI Bourse", "Côte d'Ivoire", "sgi", "active"),
    ("BNI Finances", "Côte d'Ivoire", "sgi", "active"),
    ("Hudson & Cie", "Côte d'Ivoire", "sgi", "active"),
    ("Atlantique Finance", "Côte d'Ivoire", "sgi", "active"),
    ("NSIA Finance", "Côte d'Ivoire", "sgi", "active"),
    ("Africaine de Bourse", "Côte d'Ivoire", "sgi", "active"),
    ("SOGEBOURSE", "Côte d'Ivoire", "sgi", "active"),
    ("Phoenix Capital Management", "Côte d'Ivoire", "sgi", "active"),
    ("CGF Bourse", "Sénégal", "sgi", "active"),
    ("Impaxis Securities", "Sénégal", "sgi", "active"),
    ("Everest Finance", "Sénégal", "sgi", "active"),
    ("CGF Bourse", "Sénégal", "sgi", "active"),
    ("Coris Bourse", "Burkina Faso", "sgi", "active"),
    ("SGI Bénin", "Bénin", "sgi", "active"),
    ("BOA Capital Securities", "Côte d'Ivoire", "sgi", "active"),
    ("EDC Investment Corporation", "Côte d'Ivoire", "sgi", "active"),
]

OFFICIAL_LIST_URL = "https://www.crepmf.africa/intermediaires/societes-de-gestion-et-dintermediation/"
