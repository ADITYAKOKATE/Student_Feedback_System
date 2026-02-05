import './Loader.css';

const Loader = ({ fullScreen = false }) => {
    if (fullScreen) {
        return (
            <div className="loader-fullscreen">
                <div className="loader-container">
                    <div className="loader-spinner"></div>
                    <div className="loader-text">Loading...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="loader-inline">
            <div className="loader-spinner"></div>
        </div>
    );
};

export default Loader;
