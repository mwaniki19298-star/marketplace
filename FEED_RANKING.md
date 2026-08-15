# Marketplace feed behavior

Home and Browse now use the same discovery feed logic:

1. All available products remain eligible.
2. Every fresh app session gets a different ordering seed.
3. Newer products receive a freshness boost.
4. More-viewed products receive a popularity boost.
5. Products from categories the user interacts with can receive an affinity boost.
6. Controlled randomness keeps discovery alive instead of showing the same ranking every time.

The ranking is intentionally lightweight and happens locally after the API response, so it does not add another network request or slow page switching.

For a production-grade recommendation engine, the next backend step is to persist:
- product views
- category views
- likes
- saves
- searches
- purchases
- user/category affinity

Then the backend can return a personalized feed score while still injecting exploration items.
