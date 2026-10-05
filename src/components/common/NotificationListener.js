'use client';

import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { usePathname } from 'next/navigation';
import { selectUser } from '@/lib/store/authSlice';
import { useToast } from '@/components/common/Toast';
import { getSocket } from '@/lib/socket';

export default function NotificationListener() {
    const userId = useSelector(selectUser)?._id;
    const toast = useToast();
    const pathname = usePathname();
  
    const prev = useRef(undefined);


    useEffect(() => {
        if (prev.current !== undefined && prev.current !== userId) {
            getSocket().disconnect().connect();
        }
        prev.current = userId;
    }, [userId]);


    useEffect(() => {
        if (!userId) return;
        const socket = getSocket();

        const onNew = (n) => {
            const inAdmin = pathname.startsWith('/admin');
            if ((n.forRole === 'admin') !== inAdmin) return;
            toast.info(n.body ? `${n.title}: ${n.body}` : n.title);
        };

        socket.on('notification:new', onNew);
        return () => socket.off('notification:new', onNew);
    }, [userId, toast, pathname]);

    return null;
}