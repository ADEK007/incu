import { UserProfile, useUser } from '@clerk/react';
import { useAuthStore } from '@/store/authStore';
import { User, Mail, Phone, Globe, Calendar, Shield } from 'lucide-react';

const ProfileInfoTab = () => {
  const { isLoaded, isSignedIn } = useUser();
  const { profile } = useAuthStore();

  const Row = ({ icon: Icon, label, value }: any) => (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border/50">
      <div className="p-2 rounded-lg bg-primary/10 text-primary"><Icon size={18} /></div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value || '—'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-black text-foreground">Profile Information</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your personal information and account security.</p>
      </header>

      {isLoaded && isSignedIn ? (
        <div className="w-full flex justify-center overflow-hidden rounded-2xl">
          <UserProfile
            routing="hash"
            appearance={{
              elements: {
                rootBox: 'w-full shadow-none max-w-full',
                cardBox: 'w-full shadow-none border-0 bg-transparent max-w-full',
                card: 'w-full shadow-none border-0 bg-transparent p-0 max-w-full',
                scrollBox: 'shadow-none',
                pageScrollBox: 'p-0',
              },
            }}
          />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-5 p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-3xl font-black shadow-lg">
              {profile?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-black text-foreground truncate">{profile?.full_name || 'Unnamed'}</h3>
              <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
              <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[11px] font-bold uppercase tracking-wider">
                <Shield size={12} /> {profile?.role || 'user'}
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Row icon={User} label="Full Name" value={profile?.full_name} />
            <Row icon={Mail} label="Email" value={profile?.email} />
            <Row icon={Phone} label="Phone" value={profile?.phone} />
            <Row icon={Globe} label="Country" value={profile?.country} />
            <Row icon={Calendar} label="Joined" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'} />
            <Row icon={Shield} label="Role" value={profile?.role} />
          </div>
        </>
      )}
    </div>
  );
};

export default ProfileInfoTab;

