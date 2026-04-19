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
		<div className={`info-panel ${isOpen ? 'visible' : ''}`}>
			<div className="show-eta">
				{hasArrived ? (
					<img src={locationPin} className="location-pin" />
				) : (
					<img src={timerIcon} className="timer-icon" />
				)}
				{hasArrived ? (
					'Bus has arrived!'
				) : eta && destinationCity ? (
					`ETA to ${destinationCity} ${eta} mins`
				) : (
					<p className="loading">
						Calculating<span className="dots"></span>
					</p>
				)}
			</div>
			<div className="show-network">
				{networkState === 'good' ? (
					<img src={wifi} className="networkIcon" />
				) : networkState === 'medium' ? (
					<img src={wifimedium} className="networkIcon" />
				) : networkState === 'poor' ? (
					<img src={wifipoor} className="networkIcon" />
				) : (
					<img src={networkIcon} className="network-icon" />
				)}
				{networkState || (
					<p className="loading">
						Connecting<span className="dots"></span>
					</p>
				)}
			</div>
		</div>
	);
};

export default InfoPanel;
