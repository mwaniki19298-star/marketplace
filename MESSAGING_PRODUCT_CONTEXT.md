# Product-linked seller messaging

When a buyer opens chat from a listing, the mobile app creates/opens the seller conversation and carries the listing into the message composer. The buyer can choose a quick message or edit a custom message.

Quick messages:
- Tell me more about this
- Is this still available?
- Do you deliver this product?

The first sent message can include a product context. The backend stores a snapshot containing the listing title, image, price, currency, offer state and store name. Both buyer and seller see the same product card in the conversation, even if the listing later changes.

After updating the backend, run:

```bash
python manage.py migrate
```
