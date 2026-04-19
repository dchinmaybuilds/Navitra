import { useState } from 'react';
import Map from './components/Map';
import InfoPanel from './components/InfoPanel';
import menuOpen from './assets/arrow_menu_close_20dp_FFFFFF_FILL0_wght500_GRAD0_opsz20.svg';
import menuClose from './assets/arrow_menu_open_20dp_FFFFFF_FILL0_wght500_GRAD0_opsz20.svg';

function App() {
	const [eta, setETA] = useState(null);
	const [networkState, setNetworkState] = useState(null);
	const [isOpen, setIsOpen] = useState(false);
	const [destinationCity, setDestinationCity] = useState('');
	const handleData = (data) => {
		if (data.type === 'init') {
			setDestinationCity(data.destinationCity);
		} else {
			setETA(data.eta);
			setNetworkState(data.network);
		}
	};
	return (
		<div className="App">
			<Map onData={handleData} />
			<button
				className={`infopanel-toggle ${isOpen ? 'opened' : 'closed'}`}
				onClick={() => setIsOpen((prev) => !prev)}
			>
				{isOpen ? (
					<img className="menu-close" src={menuClose} />
				) : (
					<img className="menu-open" src={menuOpen} />
				)}
			</button>
			<InfoPanel
				isOpen={isOpen}
				eta={eta}
				networkState={networkState}
				destinationCity={destinationCity}
			/>
		</div>
	);
}

export default App;
