
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, ActivityIndicator, Platform, Modal, TouchableOpacity } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

export default function App() {
	const [modalVisible, setModalVisible] = useState(false);
	const [modalVideo, setModalVideo] = useState(null);
	const [file, setFile] = useState(null);
	const [uploading, setUploading] = useState(false);
	const [message, setMessage] = useState('');
	const [videoList, setVideoList] = useState([]);
	const [loadingVideos, setLoadingVideos] = useState(false);

	const getVideoUrl = (fname) => `http://192.168.1.5:8080/download/${fname}`;

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
			<Text style={styles.header}>Video Upload & Gallery</Text>
			<Button title="Select Video" onPress={pickFile} />
			{file && <Text style={{ marginTop: 10 }}>Selected: {file.name}</Text>}
			<Button title="Upload Video" onPress={uploadFile} disabled={!file || uploading} />
			{uploading && <ActivityIndicator style={{ marginTop: 10 }} />}
			{message ? <Text style={{ marginTop: 20 }}>{message}</Text> : null}
			<View style={styles.listContainer}>
				<Text style={styles.listHeader}>Uploaded Videos:</Text>
				{loadingVideos ? (
					<ActivityIndicator style={{ marginTop: 10 }} />
				) : videoList.length === 0 ? (
					<Text style={{ marginTop: 10 }}>No videos found.</Text>
				) : (
					<View style={styles.mediaGrid}>
						{videoList.map((fname, idx) => (
							<TouchableOpacity
								key={idx}
								style={styles.mediaCard}
								onPress={() => {
									setModalVideo(getVideoUrl(fname));
									setModalVisible(true);
								}}
							>
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
								<Text style={styles.fileName} numberOfLines={1}>{fname}</Text>
							</TouchableOpacity>
						))}
					</View>
				)}
			</View>
			<StatusBar style="auto" />
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f7f7f7',
		alignItems: 'center',
		justifyContent: 'flex-start',
		padding: 20,
	},
	header: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 20,
		color: '#333',
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
	listContainer: {
		marginTop: 30,
		width: '100%',
		maxWidth: 400,
		backgroundColor: '#fff',
		borderRadius: 8,
		padding: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	listHeader: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 10,
		color: '#444',
	},
	mediaGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		marginHorizontal: -8,
	},
	mediaCard: {
		width: 120,
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
	mediaThumb: {
		width: 100,
		height: 80,
		borderRadius: 8,
		backgroundColor: '#222',
	},
	videoPlaceholder: {
		backgroundColor: '#222',
		alignItems: 'center',
		justifyContent: 'center',
		width: 100,
		height: 80,
		borderRadius: 8,
	},
	fileName: {
		marginTop: 6,
		fontSize: 12,
		color: '#555',
		maxWidth: 100,
		textAlign: 'center',
	},
});
