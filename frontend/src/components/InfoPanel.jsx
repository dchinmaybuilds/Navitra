import networkIcon from '../assets/network_wifi_22dp_FFFFFF_FILL0_wght400_GRAD0_opsz24.svg';
import timerIcon from '../assets/timer_22dp_FFFFFF_FILL0_wght400_GRAD0_opsz24.svg';
import wifi from '../assets/tdesign--wifi-1-filled.svg';
import wifimedium from '../assets/material-symbols--network-wifi-2-bar.svg';
import wifipoor from '../assets/tdesign--wifi-off-1-filled.svg';
import locationPin from '../assets/boxicons--location-pin-filled.svg';

const InfoPanel = ({
	isOpen,
	eta,
	networkState,
	destinationCity,
	hasArrived,
}) => {
	return (
		<div
			className={`info-panel ${isOpen ? 'visible' : ''} ${networkState === 'poor' ? 'warning' : ''}`}
		>
			<div className="show-eta">
				{hasArrived ? (
					<img src={locationPin} className="location-pin" />
				) : (
					<img src={timerIcon} className="timer-icon" />
				)}
				{hasArrived ? (
					'Bus has arrived!'
				) : eta > 0 ? (
					<p
						className={`eta ${networkState === 'poor' ? 'less-accurate-eta' : ''}`}
					>
						ETA to {destinationCity || 'destination'}: {eta} mins
					</p>
				) : (
					<p className="loading">
						Calculating<span className="dots"></span>
					</p>
				)}
			</div>
			<div className="show-network">
				<div className="network-wrapper">
					{networkState === 'good' ? (
						<img src={wifi} className="network-icon" />
					) : networkState === 'fluctuating' ? (
						<img src={wifimedium} className="network-icon" />
					) : networkState === 'poor' ? (
						<img src={wifipoor} className="network-icon" />
					) : (
						<img src={networkIcon} className="network-icon" />
					)}
					{networkState ? (
						networkState.toUpperCase()
					) : (
						<p className="loading">
							Connecting<span className="dots"></span>
						</p>
					)}
				</div>
				{networkState === 'poor' && (
					<p className="network-warning">Poor network! Delayed updates </p>
				)}
			</div>
		</div>
	);
};

export default InfoPanel;
