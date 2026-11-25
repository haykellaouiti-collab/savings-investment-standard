# Savings & Investment (Épargne & Investissement Pro) — livraison v4

Deux versions du même site (français, anglais, arabe RTL), prêtes pour **GitHub + Vercel**, avec leurs guides de revenus et leur logo.

| Dossier | Contenu |
|---|---|
| `1-standard-adsense/` | **Standard** : 8 simulateurs gratuits, 3 guides, banques centrales, pages légales. Revenus : **Google AdSense** (votre identifiant `pub-3266873353292561` est déjà intégré, `ads.txt` inclus). |
| `2-pro-dodo/` | **Pro** : tout le Standard sans publicité + espace membres (comparateur de crédits A/B, retraite Monte-Carlo, convertisseur de devises, scénarios). Revenus : **abonnements Dodo Payments**. |
| `docs/` | **How to Increase Your Revenue** (en anglais, Word) : `…_1-Standard-AdSense.docx` et `…_2-Pro-Dodo.docx`. |
| `brand/` | Logo moderne : SVG vectoriels, PNG, icônes, image de partage, charte (`BRAND-GUIDE.md`). |
| `generateur/` | Sources + assistant `generer.py` pour régénérer les sites avec **vos** valeurs. |

## À faire en premier
Les dossiers `site/` contiennent encore des valeurs d'exemple (URL du site, email de contact). Lancez l'assistant :

    cd generateur
    python3 generer.py

(Python 3 suffit, plus besoin de Pillow.) Il crée `dist/standard` et `dist/pro` : ce sont ces dossiers que vous envoyez sur GitHub. Suivez ensuite `DEPLOIEMENT.md` dans le dossier de la version choisie.

## Nouveautés de cette version
- **Logo** (Standard bleu/cyan avec pièce dorée, Pro violet/bleu avec étincelle) intégré au site, aux icônes et à l'image de partage.
- **Votre identifiant AdSense** pré-rempli ; option **CMP Google** (`ADSENSE_CMP=google`) : AdSense n'envoie des annonces personnalisées aux visiteurs UE/Royaume-Uni/Suisse que via un bandeau de consentement certifié. Le bandeau fourni ne l'est pas (voir le guide de revenus).
- **Lien Standard → Pro** (`PRO_URL`), **essai gratuit** (`TRIAL_DAYS`) et **codes promo** côté Pro.
- Deux guides **« How to Increase Your Revenue »** en anglais, avec les frais Dodo calculés, des scénarios chiffrés et un plan à 90 jours.

## Tests effectués
- 14 contrôles numériques (mensualité 898,83 pour 100 000 / 7 % / 15 ans, TAEG, TVM, VAN/TRI…).
- 40+ contrôles dans Chrome sur le Standard (57 pages) : 0 erreur JS, RTL, mobile, consentement.
- 20 contrôles Pro (66 pages) avec les vraies fonctions serveur, Dodo/email/devises simulés : paiement, lien magique, outils verrouillés, coupure d'accès après résiliation ; essai gratuit et codes promo vérifiés sur la charge utile envoyée à Dodo.
- **Non testé** : un vrai paiement Dodo et un vrai email (il faut vos clés) ; le compte Dodo doit d'abord être approuvé. Testez en mode `test` avant `live`.

## Sécurité
Votre document HAK IA contient un mot de passe de base de données et d'autres identifiants en clair. Considérez-les comme exposés : changez-les et gardez les secrets uniquement dans les variables d'environnement Vercel. Rien de tout cela n'a été copié dans cette livraison.
