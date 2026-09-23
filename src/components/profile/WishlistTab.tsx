import { Heart } from 'lucide-react';

const WishlistTab = () => (
  <div className="space-y-6">
    <header>
      <h2 className="text-2xl font-black text-foreground">Wishlist</h2>
      <p className="text-sm text-muted-foreground mt-1">Products you've saved for later.</p>
    </header>
    <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
      <Heart className="mx-auto text-muted-foreground mb-3" size={40} />
      <h3 className="font-bold text-foreground">Your wishlist is empty</h3>
      <p className="text-sm text-muted-foreground mt-1">Tap the heart on any product to save it here.</p>
    </div>
  </div>
);

export default WishlistTab;
