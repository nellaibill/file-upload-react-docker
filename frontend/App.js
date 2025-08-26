const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f7f7f7',
		alignItems: 'center',
		justifyContent: 'flex-start',
		padding: 0,
		paddingTop: 30,
	},
	header: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 10,
		color: '#333',
	},
	tabs: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
		alignItems: 'center',
		width: '100%',
		marginBottom: 10,
		paddingHorizontal: 10,
	},
	tab: {
		paddingVertical: 6,
		paddingHorizontal: 16,
		borderRadius: 20,
		backgroundColor: '#f0f0f0',
		marginRight: 8,
	},
	tabSelected: {
		backgroundColor: '#e91e63',
	},
	tabText: {
		color: '#555',
		fontWeight: 'bold',
	},
	tabTextSelected: {
		color: '#fff',
	},
	scrollView: {
		width: '100%',
		flex: 1,
		paddingHorizontal: 10,
	},
	dateGroup: {
		marginBottom: 18,
	},
	dateLabel: {
		fontSize: 16,
		fontWeight: 'bold',
		color: '#e91e63',
		marginBottom: 6,
		marginLeft: 4,
	},
	mediaGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		marginHorizontal: -8,
	},
	mediaCard: {
		width: 110,
		height: 140,
		borderRadius: 12,
		backgroundColor: '#fff',
		margin: 8,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.12,
		shadowRadius: 6,
		elevation: 2,
		borderWidth: 1,
		borderColor: '#ececec',
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden',
		padding: 4,
	},
	thumbWrapper: {
		position: 'relative',
		width: 90,
		height: 90,
		alignItems: 'center',
		justifyContent: 'center',
	},
	mediaThumb: {
		width: 90,
		height: 90,
		borderRadius: 8,
		backgroundColor: '#222',
	},
	videoPlaceholder: {
		backgroundColor: '#222',
		alignItems: 'center',
		justifyContent: 'center',
		width: 90,
		height: 90,
		borderRadius: 8,
	},
	playIconOverlay: {
		position: 'absolute',
		top: 32,
		left: 32,
		backgroundColor: 'rgba(0,0,0,0.4)',
		borderRadius: 20,
		width: 26,
		height: 26,
		alignItems: 'center',
		justifyContent: 'center',
	},
	playIcon: {
		color: '#fff',
		fontSize: 18,
		fontWeight: 'bold',
	},
	checkmarkOverlay: {
		position: 'absolute',
		top: 6,
		right: 6,
		backgroundColor: '#e91e63',
		borderRadius: 12,
		width: 22,
		height: 22,
		alignItems: 'center',
		justifyContent: 'center',
	},
	checkmark: {
		color: '#fff',
		fontSize: 14,
		fontWeight: 'bold',
	},
	fileName: {
		marginTop: 6,
		fontSize: 12,
		color: '#555',
		maxWidth: 90,
		textAlign: 'center',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.6)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		backgroundColor: '#fff',
		borderRadius: 12,
		padding: 20,
		alignItems: 'center',
		maxWidth: 400,
		width: '90%',
	},
	fullVideo: {
		width: 320,
		height: 320,
		marginBottom: 20,
		borderRadius: 8,
		backgroundColor: '#222',
	},
});
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, ActivityIndicator, Platform, Modal, TouchableOpacity, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

const FOLDERS = ['All'];

function groupVideosByDate(files) {
	// Example: expects file names to contain date info, or you can adapt to your backend
	// Here, we mock grouping by date for demonstration
	// Replace with actual date extraction logic if available
	const groups = {};
	files.forEach(fname => {
		// Mock: extract date from filename, fallback to 'Unknown'
		let date = 'Unknown';
		if (fname.includes('24Jul')) date = 'Thu, 24 Jul';
		else if (fname.includes('26Jul')) date = 'Sat, 26 Jul';
		else if (fname.includes('28Jul')) date = 'Mon, 28 Jul';
		else date = 'Other';
		if (!groups[date]) groups[date] = [];
		groups[date].push(fname);
	});
	return groups;
}

export default function App() {
	const [modalVisible, setModalVisible] = useState(false);
	const [modalVideo, setModalVideo] = useState(null);
	const [file, setFile] = useState(null);
	const [uploading, setUploading] = useState(false);
	const [message, setMessage] = useState('');
	const [videoList, setVideoList] = useState([]);
	const [loadingVideos, setLoadingVideos] = useState(false);
	const [selectedTab, setSelectedTab] = useState('All');
	const [selectedVideos, setSelectedVideos] = useState([]);

	// Ensure only a single filename is used for playback
	const getVideoUrl = (fname) => {
		if (Array.isArray(fname)) {
			return `http://192.168.1.5:8080/download/${fname[0]}`;
		}
		// Remove any accidental spaces or multiple filenames
		if (typeof fname === 'string' && fname.includes(' ')) {
			return `http://192.168.1.5:8080/download/${fname.split(' ')[0]}`;
		}
		return `http://192.168.1.5:8080/download/${fname}`;
	};

	const fetchVideoList = async () => {
		setLoadingVideos(true);
		try {
			const response = await fetch('http://192.168.1.5:8080/files');
			if (!response.ok) {
				setVideoList([]);
				setLoadingVideos(false);
				return;
			}
			const text = await response.text();
			let files = [];
			try {
				files = JSON.parse(text.replace(/'/g, '"'));
			} catch (err) {
				files = text.replace(/\[|\]|'/g, '').split(',').map(f => f.trim()).filter(f => f);
			}
			// Only video files
			const videos = files.filter(fname => fname.match(/\.(mp4|webm|mov)$/i));
			setVideoList(videos);
		} catch (err) {
			setVideoList([]);
		}
		setLoadingVideos(false);
	};

	useEffect(() => {
		fetchVideoList();
	}, []);

	const pickFile = async () => {
		setMessage('');
		if (Platform.OS === 'web') {
			const input = document.createElement('input');
			input.type = 'file';
			input.accept = 'video/*';
			input.onchange = (e) => {
				const fileObj = e.target.files[0];
				if (fileObj) {
					setFile({
						uri: URL.createObjectURL(fileObj),
						name: fileObj.name,
						type: fileObj.type,
						fileObj: fileObj,
					});
				} else {
					setFile(null);
				}
			};
			input.click();
		} else {
			try {
				const result = await DocumentPicker.getDocumentAsync({ type: ['video/*'] });
				if (result.type === 'success' && result.uri) {
					setFile(result);
				} else {
					setFile(null);
				}
			} catch (err) {
				setFile(null);
			}
		}
	};

	const uploadFile = async () => {
		if (!file) {
			setMessage('No file selected');
			return;
		}
		setUploading(true);
		setMessage('');
		try {
			let formData = new FormData();
			if (Platform.OS === 'web' && file.fileObj) {
				formData.append('file', file.fileObj);
			} else {
				formData.append('file', {
					uri: file.uri,
					name: file.name,
					type: file.mimeType || file.type || 'video/mp4',
				});
			}
			const response = await fetch('http://192.168.1.5:8080/upload', {
				method: 'POST',
				body: formData,
				headers: Platform.OS === 'web' ? {} : { 'Content-Type': 'multipart/form-data' },
			});
			if (!response.ok) {
				setMessage('Upload failed: HTTP ' + response.status);
			} else {
				setMessage('Upload successful!');
				fetchVideoList();
			}
		} catch (error) {
			setMessage('Upload failed: ' + error.message);
		}
		setUploading(false);
	};

	// Simulate folder filtering (replace with actual logic if available)
	const filteredVideos = selectedTab === 'All' ? videoList : videoList.filter(fname => fname.toLowerCase().includes(selectedTab.toLowerCase()));
	const groupedVideos = groupVideosByDate(filteredVideos);

	const toggleSelectVideo = (fname) => {
		setSelectedVideos((prev) =>
			prev.includes(fname) ? prev.filter(f => f !== fname) : [...prev, fname]
		);
	};

	return (
		<View style={styles.container}>
			<Modal
				visible={modalVisible}
				transparent={true}
				animationType="fade"
				onRequestClose={() => setModalVisible(false)}
			>
				<View style={styles.modalOverlay}>
					<View style={styles.modalContent}>
						{modalVideo && Platform.OS === 'web' && (
							<video src={modalVideo} style={styles.fullVideo} controls autoPlay />
						)}
						<Button title="Close" onPress={() => setModalVisible(false)} />
					</View>
				</View>
			</Modal>
			<Text style={styles.header}>Video Gallery</Text>
			<View style={styles.tabs}>
				{FOLDERS.map(tab => (
					<TouchableOpacity
						key={tab}
						style={[styles.tab, selectedTab === tab && styles.tabSelected]}
						onPress={() => setSelectedTab(tab)}
					>
						<Text style={[styles.tabText, selectedTab === tab && styles.tabTextSelected]}>{tab}</Text>
					</TouchableOpacity>
				))}
			</View>
			<Button title="Select Video" onPress={pickFile} />
			{file && <Text style={{ marginTop: 10 }}>Selected: {file.name}</Text>}
			<Button title="Upload Video" onPress={uploadFile} disabled={!file || uploading} />
			{uploading && <ActivityIndicator style={{ marginTop: 10 }} />}
			{message ? <Text style={{ marginTop: 20 }}>{message}</Text> : null}
			<ScrollView style={styles.scrollView}>
				{loadingVideos ? (
					<ActivityIndicator style={{ marginTop: 10 }} />
				) : Object.keys(groupedVideos).length === 0 ? (
					<Text style={{ marginTop: 10 }}>No videos found.</Text>
				) : (
					Object.entries(groupedVideos).map(([date, videos]) => (
						<View key={date} style={styles.dateGroup}>
							<Text style={styles.dateLabel}>{date}</Text>
							<View style={styles.mediaGrid}>
								{videos.map((fname, idx) => (
									<TouchableOpacity
										key={fname}
										style={styles.mediaCard}
										  onPress={() => {
											  // Always use only one filename for playback
											  setModalVideo(getVideoUrl(fname));
											  setModalVisible(true);
										  }}
										onLongPress={() => toggleSelectVideo(fname)}
									>
										<View style={styles.thumbWrapper}>
											{Platform.OS === 'web' ? (
												<video
													src={getVideoUrl(fname)}
													style={styles.mediaThumb}
													controls={false}
													muted
													width={80}
													height={80}
													poster=""
												/>
											) : (
												<View style={[styles.mediaThumb, styles.videoPlaceholder]}>
													<Text style={{ color: '#fff' }}>Video</Text>
												</View>
											)}
											<View style={styles.playIconOverlay}>
												<Text style={styles.playIcon}>▶</Text>
											</View>
											{selectedVideos.includes(fname) && (
												<View style={styles.checkmarkOverlay}>
													<Text style={styles.checkmark}>✔</Text>
												</View>
											)}
										</View>
										<Text style={styles.fileName} numberOfLines={1}>{fname}</Text>
									</TouchableOpacity>
								))}
							</View>
						</View>
					))
				)}
			</ScrollView>
			<StatusBar style="auto" />
		</View>
	);
}


