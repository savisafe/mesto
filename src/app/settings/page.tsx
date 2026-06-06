import SettingsPage from '@/views/SettingsPage';
import PublicBookingSettings from '@/views/PublicBookingSettings';

export default function Page() {
    return (
        <div className="flex flex-col items-center gap-6 bg-gradient-to-br from-purple-950 to-black px-4 pt-6">
            <PublicBookingSettings />
            <SettingsPage />
        </div>
    );
}
