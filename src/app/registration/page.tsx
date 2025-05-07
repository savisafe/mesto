import RegistrationPage from "@/pages/RegistrationPage";
import {Suspense} from "react";

export default function Page() {
    return (
        <Suspense fallback="Загрузка...">
            <RegistrationPage/>
        </Suspense>
    );
}