# Deep Sleep — Firestore Security Specification

## 1. Data Invariants
- Every document in `/products/{productId}` represents a public furniture catalog item and MUST conform to the `Product` schema (`category`, `nameAr`, `descAr`, `price`, `discountPercent`, `specsAr`, `image`, `createdBy`, `createdAt`, `updatedAt`).
- `category` must belong to the 8 valid Deep Sleep categories (`bedrooms`, `beds`, `vanities`, `wardrobes`, `mattresses`, `wall_decor`, `nightstands`, `pillows`).
- Only verified store admins (`hamamalidrose@gmail.com` and `louayaladross@gmail.com`, or UIDs in `/admins/{uid}`) may create, update, or delete products.
- `createdBy` must equal `request.auth.uid` on creation and is immutable on update.
- `createdAt` must equal `request.time` on creation and is immutable on update; `updatedAt` must equal `request.time` on both creation and update.
- Public visitors may read (`/products` `get` and `list`) without authentication since products contain zero PII.
- `/admins/{adminId}` is strictly read-only for the matching authenticated UID and never writable from client SDKs.

## 2. Adversarial Test Matrix ("Dirty Dozen" Payloads)
1. **Unauthenticated Create**: Anonymous visitor tries `setDoc(doc(db, 'products', 'hack1'), ...)` -> `PERMISSION_DENIED`.
2. **Non-Admin Signed-In Create**: Random verified Google user (`attacker@gmail.com`) tries creating a product -> `PERMISSION_DENIED`.
3. **Email Spoofing (`email_verified: false`)**: Token claims `hamamalidrose@gmail.com` with `email_verified: false` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection**: Admin sends `{ ...validProduct, isFeaturedOverride: true }` -> `PERMISSION_DENIED` (`hasOnly` check).
5. **Invalid Category Enum**: Admin sends `category: "sofas"` -> `PERMISSION_DENIED`.
6. **Negative / Zero Price**: Admin sends `price: -50` or `price: 0` -> `PERMISSION_DENIED`.
7. **Out-of-Bounds Discount**: Admin sends `discountPercent: 95` -> `PERMISSION_DENIED`.
8. **ID Poisoning**: Admin attempts create with `productId = "../other/doc"` or 500-char ID -> `PERMISSION_DENIED` (`isValidId`).
9. **Identity Spoofing on Create**: Admin sets `createdBy: "someone_else_uid"` -> `PERMISSION_DENIED`.
10. **Immutable Field Tampering on Update**: Admin tries modifying `createdAt` or `createdBy` -> `PERMISSION_DENIED`.
11. **Backdated Timestamp**: Admin sends client-forged `updatedAt: new Date(2020, 1, 1)` instead of `serverTimestamp()` -> `PERMISSION_DENIED`.
12. **Client-Side Admin Escalation**: Attacker tries `setDoc(doc(db, 'admins', myUid), { role: 'admin' })` -> `PERMISSION_DENIED`.
