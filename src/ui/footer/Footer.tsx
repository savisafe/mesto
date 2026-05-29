export function Footer() {
    const year = new Date().getFullYear();
    return (
        <footer className="w-full py-6 border-t border-purple-800 text-center text-sm text-purple-400 bg-purple-950 bg-opacity-20">
            <p>Mesto — CRM-система для бизнеса © {year}</p>
            <p className="mt-1">Связь: support@mesto.pro</p>
        </footer>
    );
}