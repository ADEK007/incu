import { useState } from 'react';
import { User, ShoppingBag, Heart, Star, MessageCircleQuestion, Settings as SettingsIcon } from 'lucide-react';
import ProfileInfoTab from '@/components/profile/ProfileInfoTab';
import OrdersTab from '@/components/profile/OrdersTab';
import WishlistTab from '@/components/profile/WishlistTab';
import ReviewsTab from '@/components/profile/ReviewsTab';
import QnATab, { useUnreadQACount } from '@/components/profile/QnATab';
import SettingsTab from '@/components/profile/SettingsTab';
import { useTranslation } from '@/hooks/useTranslation';

type TabId = 'profile' | 'orders' | 'wishlist' | 'reviews' | 'qna' | 'settings';

const Profile = () => {
  const [tab, setTab] = useState<TabId>('profile');
  const unread = useUnreadQACount();
  const { t } = useTranslation();

  const tabs: { id: TabId; label: string; icon: any; badge?: number }[] = [
    { id: 'profile', label: t.profile.tabInfo, icon: User },
    { id: 'orders', label: t.profile.tabOrders, icon: ShoppingBag },
    { id: 'wishlist', label: t.profile.tabWishlist, icon: Heart },
    { id: 'reviews', label: t.profile.tabReviews, icon: Star },
    { id: 'qna', label: t.profile.tabQnA, icon: MessageCircleQuestion, badge: unread },
    { id: 'settings', label: t.profile.tabSettings, icon: SettingsIcon },
  ];

  const render = () => {
    switch (tab) {
      case 'profile': return <ProfileInfoTab />;
      case 'orders': return <OrdersTab />;
      case 'wishlist': return <WishlistTab />;
      case 'reviews': return <ReviewsTab />;
      case 'qna': return <QnATab />;
      case 'settings': return <SettingsTab />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-black text-foreground">{t.profile.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t.profile.subtitle}</p>
      </header>

      {/* Mobile tabs */}
      <nav className="lg:hidden mb-6 -mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max pb-2">
          {tabs.map(item => {
            const active = item.id === tab;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`relative inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  active ? 'bg-primary text-primary-foreground shadow' : 'bg-card border border-border text-foreground hover:bg-muted'
                }`}
              >
                <Icon size={15} />
                {item.label}
                {item.badge ? (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black">{item.badge}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block">
          <nav className="sticky top-24 bg-card border border-border rounded-2xl p-2 space-y-1">
            {tabs.map(item => {
              const active = item.id === tab;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    active ? 'bg-primary text-primary-foreground shadow' : 'text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon size={17} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge ? (
                    <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black ${
                      active ? 'bg-primary-foreground text-primary' : 'bg-red-500 text-white'
                    }`}>{item.badge}</span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <section className="bg-card border border-border rounded-2xl p-6 sm:p-8 min-h-[400px]">
          {render()}
        </section>
      </div>
    </div>
  );
};

export default Profile;
