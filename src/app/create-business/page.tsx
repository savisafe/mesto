'use client';
import {LayoutPage} from "@/ui/layouts/LayoutPage";
import {Input} from "@/ui/input/Input";
import {useEffect, useState} from "react";
import {Button} from "@/ui/button/Button";
import {supabase} from "../../../supabaseClient";

export default function CreateBusinessPage() {
    const [businessName, setBusinessName] = useState('');
    const [businessesList, setBusinessesList] = useState();

    const fetchBusiness = async () => {
        const {data, error} = await supabase.from('businesses').select('*');
        if (error) {
            console.error('Ошибка получения бизнеса:', error);
        } else {
            console.log('Данные бизнеса:', data);
        }
    }

    const handleCreateBusiness = async () => {
        const {data, error} = await supabase.from('businesses').insert({ name: 'Mesto.pro' });
        if (error) {
            console.error('Ошибка создания бизнеса:' + error);
        } else {
            console.log('Бизнес успешно создан:', data);
        }
    }

    useEffect(() => {
        fetchBusiness();
    }, []);

    return (
        <LayoutPage title={'Создание бизнеса'}>
            <Input type="text" placeholder="Введите название бизнеса" value={businessName} setValue={setBusinessName}/>
            <Button text="Созадать бизнес" onClick={handleCreateBusiness}/>
        </LayoutPage>
    )
}