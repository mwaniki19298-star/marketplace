# Marketplace performance adjustments

- Home product feed uses `FlatList` instead of a full `ScrollView` + mapped product grid.
- Browse feed uses virtualized `FlatList`.
- Lists use small render batches and a limited render window to keep memory use low.
- Android lists enable `removeClippedSubviews`.
- Product tiles are memoized to avoid unnecessary rerenders.
- Home/Browse filtering and list headers are memoized.
- Product images disable fade animation and use Android resize decoding.
- Navigation remains single-screen conditional rendering with no transition animation, keeping page switches immediate.
