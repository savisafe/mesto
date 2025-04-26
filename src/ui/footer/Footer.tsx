'use client';
export function Footer() {
    return (
        <footer className="w-full py-6 border-t border-purple-800 text-center text-sm text-purple-400 bg-purple-950 bg-opacity-20">
            {/*//TODO добавить ссылку на политику конфиденциальности*/}
            {/*//TODO добавить ссылку на пользовательское соглашение*/}
            {/*//TODO добавить ссылку на условия использования*/}
            {/*//TODO добавить ссылку на условия возврата*/}
            {/*//TODO убрать хардкод года*/}
            <p>Mesto — CRM-система для бизнеса © 2025</p>
            {/*//TODO написать бота поддержки*/}
            <p className="mt-1">Связь: support@mesto.mesto</p>
        </footer>
    );
}