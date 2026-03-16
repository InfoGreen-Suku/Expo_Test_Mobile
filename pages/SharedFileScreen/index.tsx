import React, { useEffect, useState } from 'react';
import { BackHandler, Button, Dimensions, Image, Text, TouchableOpacity, View } from 'react-native';
import Pdf from 'react-native-pdf';
// import Video from 'react-native-video';
import { scaleFont } from '@/constants/ScaleFont';
import { PostSharedFile } from '@/hooks/api/PostSharedFile';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';
import { useEvent } from 'expo';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useDispatch } from 'react-redux';
import { styles } from './style';
const ScreenHeight = Dimensions.get('window').height;
export default function Sharedfile({ route }: any) {
  const { filepath } = route.params ?? {};
  const fileExtension = filepath ? filepath.substring(filepath.lastIndexOf('.') + 1).toLowerCase() : null;
  const navigation = useNavigation<any>()
  const dispatch = useDispatch()
  // derive audio playing state from player status instead of local state
  const [sound, setSound] = useState(null);
  const player = useAudioPlayer(filepath);
  const status = useAudioPlayerStatus(player);
  const videoPlayer = useVideoPlayer(filepath, player => {
    player.loop = true;
    player.play();
  });

  const { isPlaying } = useEvent(videoPlayer, 'playingChange', { isPlaying: videoPlayer.playing });

  useEffect(() => {
    const backAction = () => {
      // Handle back button press here
      navigation.goBack();
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    return () => backHandler.remove();
  }, []);
  const audioIsPlaying = !!status?.playing;
  const audioHasEnded = !!status?.didJustFinish;

  useEffect(() => {
    // Prevent any accidental autoplay for audio on mount
    if (fileExtension === 'mp3' && audioIsPlaying) {
      player.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // After finishing, reset to start so it can be replayed
    if (fileExtension === 'mp3' && audioHasEnded) {
      try {
        player.seekTo(0);
      } catch (e) {
        // ignore
      }
    }
  }, [fileExtension, audioHasEnded, player]);

  const renderContent = () => {
    switch (fileExtension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
        return (

          <Image source={{ uri: 'file://' + filepath }} style={styles.image} />

        );
      case 'mp4':
        return (

          <View style={styles.contentContainer}>
            <VideoView style={styles.video} player={videoPlayer} allowsFullscreen allowsPictureInPicture />
            <View style={styles.controlsContainer}>
              <Button
                title={isPlaying ? 'Pause' : 'Play'}
                onPress={() => {
                  if (isPlaying) {
                    videoPlayer.pause();
                  } else {
                    videoPlayer.play();
                  }
                }}
              />
            </View>

          </View>

        );
      case 'mp3':
        const togglePlayPause = async () => {
          if (audioIsPlaying) {
            player.pause();
          } else {
            if (audioHasEnded) {
              try {
                await player.seekTo(0);
              } catch (e) {
                // ignore
              }
            }
            player.play();
          }
        }

        return (

          <View style={{ width: '100%', height: '90%', justifyContent: 'center', alignSelf: 'center' }}>
            <Text style={{ textAlign: 'center', fontWeight: 'bold', color: 'black', fontSize: scaleFont(9) }}>
              {audioIsPlaying ? 'Playing Audio...' : 'Audio Stopped'}
            </Text>
            <TouchableOpacity onPress={togglePlayPause} style={{ alignSelf: 'center', marginTop: 20 }}>
              {audioIsPlaying ? (
                <FontAwesome5 name="stop-circle" size={40} color="red" />

              ) : (
                <FontAwesome5 name="play-circle" size={40} color="green" />
              )}
            </TouchableOpacity>
          </View>

        );
      case 'pdf':
        return (
          <>


            <Pdf
              source={{ uri: `file://${filepath}` }}
              onLoadComplete={(numberOfPages, filePath) => {
                console.log(`Number of pages: ${numberOfPages}`);
                console.log(`File path: ${filePath}`);
              }}
              onPageChanged={(page, numberOfPages) => {
                console.log(`Current page: ${page}`);
              }}
              onError={(error) => {
                console.log(error);
              }}
              onPressLink={(uri) => {
                console.log(`Link pressed: ${uri}`);
              }}
              style={styles.pdf}
            />
          </>

        );
      default:
        return <Text style={{ width: '100%', height: '90%', justifyContent: 'center', textAlign: 'center', fontWeight: 'bold', color: 'black', alignSelf: 'center', top: "40%", fontSize: scaleFont(8) }}>Unsupported file type</Text>;
    }
  };
  const SharedDataURL = async (imagePath: any) => {
    const formData: any = new FormData();
    formData.append('URL', imagePath);
    // console.log(imagePath);

    // Send the FormData object to the API
    const details = await PostSharedFile(formData)
    dispatch({ type: 'POST_SharedFile_SUCCESS', payload: details })
    navigation.navigate("Webview")
  }

  const SharedData = async (imagePath: any) => {
    const formData: any = new FormData();
    formData.append('image', {
      uri: `file://${imagePath}`,
      name: 'image.jpg', // You can adjust the filename as needed
      type: 'image/jpeg', // Adjust the MIME type if needed
    });
    // console.log(imagePath);

    // Send the FormData object to the API
    const details = await PostSharedFile(formData)
    dispatch({ type: 'POST_SharedFile_SUCCESS', payload: details })
    navigation.navigate("Webview")
  }

  const SharedDataPDF = async (filePath: any) => {
    const formData: any = new FormData();
    formData.append('PDF', {
      uri: `file://${filePath}`,
      name: 'sharedFile.pdf', // You can adjust the filename as needed
      type: 'application/pdf', // Adjust the MIME type if needed
    });
    // console.log(imagePath);

    // Send the FormData object to the API
    const details = await PostSharedFile(formData)
    dispatch({ type: 'POST_SharedFile_SUCCESS', payload: details })
    navigation.navigate("Webview")
  }

  const SharedDataVideo = async (filePath: any) => {
    const formData: any = new FormData();
    formData.append('video', {
      uri: `file://${filePath}`, // Ensure imagePath points to the video file
      name: 'video.mp4', // Change the filename extension to .mp4 or the appropriate video file extension
      type: 'video/mp4', // Change MIME type to video/mp4 or the appropriate MIME type for your video file
    });
    // console.log(imagePath);
    // Send the FormData object to the API
    const details = await PostSharedFile(formData)
    dispatch({ type: 'POST_SharedFile_SUCCESS', payload: details })
    navigation.navigate("Webview")
  }
  const SharedDataAudio = async (filePath: any) => {
    const formData: any = new FormData();
    formData.append('audio', {
      uri: `file://${filePath}`,
      name: 'audio.mp3', // You can adjust the filename as needed
      type: 'audio/mpeg', // Adjust the MIME type if needed
    });
    // console.log(imagePath);
    // Send the FormData object to the API
    const details = await PostSharedFile(formData)
    dispatch({ type: 'POST_SharedFile_SUCCESS', payload: details })
    navigation.navigate("Webview")
  }
  return (
    <View style={styles.container}>
      <View
        style={{
          flexDirection: 'row',
          gap: 50,
          marginBottom: 30,
          backgroundColor: '#008541',
          width: '100%',
          height: '7%',
        }}>
        <AntDesign name="close-circle" size={scaleFont(25)} color="#fff" style={{ alignSelf: 'center', left: scaleFont(20), top: scaleFont(10), marginBottom: scaleFont(15) }}
          onPress={() => navigation.goBack()} />

        <Text
          style={{
            fontSize: scaleFont(20),
            textAlign: 'center',
            fontWeight: '500',
            color: '#fff',
            top: 12,
        }}>
          Shared File
        </Text>
      </View>
      <View style={{ flex: 1, width: '100%', height: '90%', justifyContent: 'center', alignItems: 'center' }}>
        {renderContent()}
      </View>
      <TouchableOpacity style={{ backgroundColor: '#008541', padding: 8, width: '95%', borderRadius: 10, marginBottom: ScreenHeight * 0.04, alignSelf: 'center' }} onPress={() => { SharedDataPDF(filepath) }}>
        <Text style={{ color: '#fff', textAlign: 'center', fontSize: scaleFont(17) }}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
}

