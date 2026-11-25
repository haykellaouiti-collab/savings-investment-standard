# Version Standard — GitHub + Vercel + AdSense

Votre identifiant AdSense `ca-pub-3266873353292561` est déjà intégré : `ads.txt` contient `google.com, pub-3266873353292561, DIRECT, f08c47fec0942fa0`.

## 1. Générer le site avec vos valeurs
    cd generateur
    python3 generer.py
Renseignez l'URL finale du site, l'email de contact public, et (optionnel) l'URL du site Pro. Le site est créé dans `dist/standard`.

## 2. GitHub
1. Créez un dépôt sur github.com.
2. Envoyez **le contenu** de `dist/standard` (pas le dossier lui-même) à la racine : `index.html`, `vercel.json`, `assets/`, `en/`, `ar/`… doivent être visibles à la racine.

## 3. Vercel
1. vercel.com → **Add New → Project** → importez le dépôt.
2. *Framework Preset* : **Other**. *Build Command* et *Output Directory* **vides**. → **Deploy**.
3. Ajoutez votre domaine dans *Settings → Domains* (recommandé pour AdSense). Si l'URL change, relancez `generer.py` et renvoyez les fichiers : Vercel redéploie seul.

## 4. AdSense
1. Dans AdSense, ajoutez le domaine et lancez la vérification (le fichier `ads.txt` est déjà en place).
2. Activez les **annonces automatiques**, ou créez un bloc d'annonces et renseignez son identifiant (`ADSENSE_SLOT`) dans `generer.py` pour des emplacements manuels.
3. **Consentement UE/Royaume-Uni/Suisse** — deux options :
   - **own** (défaut) : le bandeau fourni, conforme mais non certifié TCF → ces visiteurs ne reçoivent que des annonces non personnalisées ou limitées.
   - **google** : AdSense → *Privacy & messaging* → créez et **publiez** le message « European regulations » pour votre site, puis relancez `generer.py` avec `ADSENSE_CMP=google` et redéployez. Ne basculez pas avant d'avoir publié le message.
4. Voir `docs/How-to-Increase-Your-Revenue_1-Standard-AdSense.docx` pour le plan complet (trafic, RPM, 90 jours).

## 5. Référencement
- Google Search Console → ajoutez le domaine → soumettez `https://votre-domaine/sitemap.xml`.
- `/` = français, `/en/` = anglais, `/ar/` = arabe (reliés par `hreflang`).

## 6. À relire avant la mise en ligne
- Email de contact et nom de l'éditeur (À propos / Contact / Confidentialité).
- Traductions arabes (relecture par un natif recommandée).
