# -*- coding: utf-8 -*-
"""Assistant de configuration : python3 generer.py
Pose quelques questions, puis genere les deux sites prets a deployer dans ./dist/standard et ./dist/pro
(Prerequis : Python 3 uniquement)"""
import os, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
def ask(label, env, default=''):
    cur = os.environ.get(env, default)
    v = input('%s [%s] : ' % (label, cur or 'vide')).strip() if sys.stdin.isatty() else ''
    os.environ[env] = v or cur
print('=== Configuration (Entree = garder la valeur entre crochets) ===')
ask('URL finale du site (ex. https://monsite.vercel.app)', 'SITE_URL', 'https://epargne-pro.vercel.app')
ask('Email de contact public', 'CONTACT_EMAIL', 'contact@example.com')
ask('Identifiant editeur AdSense - Standard', 'ADSENSE_CLIENT', 'ca-pub-3266873353292561')
ask('Consentement AdSense : own (bandeau fourni) ou google (Privacy & messaging, CMP certifie)', 'ADSENSE_CMP', 'own')
ask('URL du site Pro (pour le lien Standard -> Pro, optionnel)', 'PRO_URL', '')
ask('Identifiant du bloc publicitaire (optionnel) - Standard', 'ADSENSE_SLOT', '')
ask('Prix mensuel Pro (affichage, doit egaler Dodo)', 'PRICE_MONTHLY', '4.99')
ask('Prix annuel Pro (affichage, doit egaler Dodo)', 'PRICE_ANNUAL', '39')
ask('Devise des prix Pro', 'PRICE_CURRENCY', 'USD')
for variant, name in (('std', 'standard'), ('pro', 'pro')):
    env = dict(os.environ, OUT_DIR=os.path.join(os.getcwd(), 'dist', name))
    subprocess.check_call([sys.executable, os.path.join(here, 'build.py'), variant], env=env)
print('\nTermine. Sites prets dans ./dist/standard et ./dist/pro')
