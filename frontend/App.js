import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, ActivityIndicator, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

export default function App() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [debug, setDebug] = useState('');

  const pickFile = async () => {
    setMessage('');
    setDebug('');
    if (Platform.OS === 'web') {
      // Use a hidden HTML file input for web
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = (e) => {
        const fileObj = e.target.files[0];
        if (fileObj) {
          setFile({
            uri: URL.createObjectURL(fileObj),
            name: fileObj.name,
            type: fileObj.type,
            fileObj: fileObj,
          });
          setDebug(JSON.stringify({ name: fileObj.name, type: fileObj.type }, null, 2));
        } else {
          setFile(null);
        }
      };
      input.click();
    } else {
      try {
        const result = await DocumentPicker.getDocumentAsync({});
        setDebug(JSON.stringify(result, null, 2));
        if (result.type === 'success' && result.uri) {
          setFile(result);
        } else {
          setFile(null);
        }
      } catch (err) {
        setDebug('Picker error: ' + err.message);
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
    setDebug('');
    try {
      let formData = new FormData();
      if (Platform.OS === 'web' && file.fileObj) {
        formData.append('file', file.fileObj);
      } else {
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || file.type || 'application/octet-stream',
        });
      }
      const response = await fetch('http://192.168.1.5:8080/upload', {
        method: 'POST',
        body: formData,
        headers: Platform.OS === 'web' ? {} : { 'Content-Type': 'multipart/form-data' },
      });
      if (!response.ok) {
        const text = await response.text();
        setMessage('Upload failed: HTTP ' + response.status);
        setDebug('Response: ' + text);
      } else {
        const text = await response.text();
        setMessage(text);
      }
    } catch (error) {
      setMessage('Upload failed: ' + error.message);
      setDebug('Error object: ' + JSON.stringify(error, Object.getOwnPropertyNames(error)));
    }
    setUploading(false);
  };

  return (
    <View style={styles.container}>
      <Button title="Select File" onPress={pickFile} />
      {file && <Text style={{ marginTop: 10 }}>Selected: {file.name}</Text>}
      <Button title="Upload File" onPress={uploadFile} disabled={!file || uploading} />
      {uploading && <ActivityIndicator style={{ marginTop: 10 }} />}
      {message ? <Text style={{ marginTop: 20 }}>{message}</Text> : null}
      {debug ? <Text style={{ marginTop: 20, color: 'gray' }}>Debug: {debug}</Text> : null}
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
