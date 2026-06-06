import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPublicBusiness } from '@/services/public-booking';
import { PublicBookingPage } from '@/views/PublicBookingPage';

export const runtime = 'nodejs';

interface PageProps {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { slug } = await params;
    const business = await getPublicBusiness(slug);
    if (!business) return { title: 'Запись — Mesto' };
    return {
        title: `${business.name} — онлайн-запись`,
        description: business.description ?? `Онлайн-запись в «${business.name}»`,
    };
}

export default async function Page({ params }: PageProps) {
    const { slug } = await params;
    const business = await getPublicBusiness(slug);
    if (!business) notFound();
    return <PublicBookingPage business={business} />;
}
