import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';

export const fileService = {
  downloadFile: async (url: string, filename: string): Promise<string | null> => {
    try {
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      const { uri } = await FileSystem.downloadAsync(url, fileUri);
      return uri;
    } catch (error) {
      console.error('Download failed:', error);
      return null;
    }
  },

  shareFile: async (uri: string, mimeType?: string): Promise<void> => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing not available', 'Sharing is not supported on this device');
        return;
      }

      await Sharing.shareAsync(uri, {
        mimeType: mimeType || 'application/octet-stream',
        dialogTitle: 'Share file',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  },

  readFile: async (uri: string): Promise<string | null> => {
    try {
      return await FileSystem.readAsStringAsync(uri);
    } catch (error) {
      console.error('Read failed:', error);
      return null;
    }
  },

  writeFile: async (uri: string, content: string): Promise<boolean> => {
    try {
      await FileSystem.writeAsStringAsync(uri, content);
      return true;
    } catch (error) {
      console.error('Write failed:', error);
      return false;
    }
  },

  deleteFile: async (uri: string): Promise<boolean> => {
    try {
      await FileSystem.deleteAsync(uri);
      return true;
    } catch (error) {
      console.error('Delete failed:', error);
      return false;
    }
  },

  getFileInfo: async (uri: string): Promise<FileSystem.FileInfo | null> => {
    try {
      return await FileSystem.getInfoAsync(uri);
    } catch (error) {
      console.error('Get info failed:', error);
      return null;
    }
  },

  createDirectory: async (dirPath: string): Promise<boolean> => {
    try {
      await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
      return true;
    } catch (error) {
      console.error('Create directory failed:', error);
      return false;
    }
  },

  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },
};