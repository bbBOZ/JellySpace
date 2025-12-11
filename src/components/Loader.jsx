import { useApp } from '../context/AppContext';

export default function Loader() {
    const { isLoading } = useApp();

    if (!isLoading) return null;

    return (
        <div className="loader-overlay">
            <div className="loader"></div>
        </div>
    );
}
