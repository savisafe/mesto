import { Suspense } from 'react';
import RegistrationPage from '@/views/RegistrationPage';

export default function Page() {
    return (
        <Suspense fallback={null}>
            <RegistrationPage />
        </Suspense>
    );
}
