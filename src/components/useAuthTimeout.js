import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const useAuthTimeout = () => {
    const navigate = useNavigate();

    useEffect(() => {
        let timer;
        const logout = () => {
            localStorage.clear();
            navigate('/login');
        };

        const resetTimer = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(logout, 604800); // 1 minute
        };

        // Watch for user activity
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keypress', resetTimer);

        resetTimer(); // Start timer on load

        return () => {
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keypress', resetTimer);
            clearTimeout(timer);
        };
    }, [navigate]);
};

export default useAuthTimeout;