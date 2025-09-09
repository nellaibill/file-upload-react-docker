import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, ActivityIndicator, Platform, Modal, TouchableOpacity, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

function groupVideosByDate(files) {
  const groups = {};
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  files.forEach(file => {
    const fileDate = new Date(file.lastModified);
    let label;
    if (
      fileDate.getDate() === today.getDate() &&
      fileDate.getMonth() === today.getMonth() &&
      fileDate.getFullYear() === today.getFullYear()
    ) {
      label = 'Today';
    } else if (
      fileDate.getDate() === yesterday.getDate() &&
      fileDate.getMonth() === yesterday.getMonth() &&
      fileDate.getFullYear() === yesterday.getFullYear()
    ) {
      label = 'Yesterday';
    } else {
      label = fileDate.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(file);
  });
  const sortedLabels = Object.keys(groups).sort((a, b) => {
    const parseDate = (label) => {
      if (label === 'Today') return today.getTime();
      if (label === 'Yesterday') return yesterday.getTime();
      return new Date(label).getTime();
    };
    return parseDate(b) - parseDate(a);
  });
  return sortedLabels.map(label => ({ label, files: groups[label] }));
}

export default function App() {

  const [modalVisible, setModalVisible] = useState(false);
  const [modalVideo, setModalVideo] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [videoList, setVideoList] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  // Use dynamic backend API URLs for browser access
  const backendHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const backendPort = 8080;
  const getVideoUrl = async (fname) => {
    // Fetch pre-signed download URL from backend
    try {
      const resp = await fetch(`http://${backendHost}:${backendPort}/download/${fname}`);
      if (!resp.ok) return null;
      const data = await resp.json();
      return data.download_url;
    } catch {
      return null;
    }
  };


  const fetchVideoList = async () => {
    setLoadingVideos(true);
    try {
      const response = await fetch(`http://${backendHost}:${backendPort}/files`);
      if (!response.ok) {
        setVideoList([]);
        setLoadingVideos(false);
        return;
      }
      const files = await response.json();
      // The backend returns [{ video_id, filename, content_type, created_at }]
      const videos = files.filter(file => file.filename && file.filename.match(/\.(mp4|webm|mov)$/i));
      videos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
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
      // 1. Request pre-signed upload URL from backend
      const videoId = `vid_${Date.now()}`;
      const uploadMeta = {
        video_id: videoId,
        filename: file.name,
        content_type: file.type || file.mimeType || 'video/mp4',
      };
      const resp = await fetch(`http://${backendHost}:${backendPort}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(uploadMeta),
      });
      if (!resp.ok) {
        setMessage('Failed to get upload URL: HTTP ' + resp.status);
        setUploading(false);
        return;
      }
      const { upload_url } = await resp.json();
      // 2. Upload file to S3 using pre-signed URL
      let uploadResp;
      // Replace any 'localstack:PORT' with 'localhost:9007' to avoid double port in URL
      const fixedUrl = upload_url.replace(/localstack:\d+/, backendHost + ':9007');
      if (Platform.OS === 'web' && file.fileObj) {
        uploadResp = await fetch(fixedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.fileObj.type || 'video/mp4' },
          body: file.fileObj,
        });
      } else {
        // For native, fetch/Blob may need adjustment
        uploadResp = await fetch(fixedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.mimeType || file.type || 'video/mp4' },
          body: file,
        });
      }
      if (!uploadResp.ok) {
        setMessage('S3 upload failed: HTTP ' + uploadResp.status);
      } else {
        setMessage('Upload successful!');
        setFile(null);
        fetchVideoList();
      }
    } catch (error) {
      setMessage('Upload failed: ' + error.message);
    }
    setUploading(false);
  };


  const groupedVideos = groupVideosByDate(
    videoList.map(v => ({
      ...v,
      name: v.filename,
      lastModified: v.created_at,
    }))
  );

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
      <Button title="Select Video" onPress={pickFile} />
      {file && <Text style={{ marginTop: 10 }}>Selected: {file.name}</Text>}
      <Button title="Upload Video" onPress={uploadFile} disabled={!file || uploading} />
      {uploading && <ActivityIndicator style={{ marginTop: 10 }} />}
      {message ? <Text style={{ marginTop: 20 }}>{message}</Text> : null}
      <ScrollView style={styles.scrollView}>
        {loadingVideos ? (
          <ActivityIndicator style={{ marginTop: 10 }} />
        ) : groupedVideos.length === 0 ? (
          <Text style={{ marginTop: 10 }}>No videos found.</Text>
        ) : (
          groupedVideos.map(({ label, files }) => (
            <View key={label} style={styles.dateGroup}>
              <Text style={styles.dateLabel}>{label}</Text>
              <View style={styles.mediaGrid}>
                {files.map((file) => (
                  <TouchableOpacity
                    key={file.name}
                    style={styles.mediaCard}
                    onPress={async () => {
                      const url = await getVideoUrl(file.name);
                      if (url) {
                        setModalVideo(url);
                        setModalVisible(true);
                      } else {
                        setMessage('Failed to get download URL');
                      }
                    }}
                  >
                    <View style={styles.thumbWrapper}>
                      {Platform.OS === 'web' ? (
                        <video
                          src={getVideoUrl(file.name)}
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
                    </View>
                    <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
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
