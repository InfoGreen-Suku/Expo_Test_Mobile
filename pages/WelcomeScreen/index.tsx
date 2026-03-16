import { scaleFont } from '@/constants/ScaleFont'; // Assuming this utility is available
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Dimensions, FlatList, Image, Text, TouchableHighlight, TouchableOpacity, View } from 'react-native';
import { styles } from './style'; // Assuming styles are defined here

// --- Page Data Definition ---
const PAGES = [
  {
    imageSource: require('../../assets/images/GstBilling.png'),
    title: 'GST Billing Software',
    subtitle: 'Create GST-compliant invoices instantly and track tax reports effortlessly. Simplify billing and boost financial accuracy.',
  },
  {
    imageSource: require('../../assets/images/HR.png'),
    title: 'HR Management System',
    subtitle: 'Handle payroll, attendance, and employee data with ease. Automate HR tasks and focus on your people.',
  },
  {
    imageSource: require('../../assets/images/WareHouse.png'),
    title: 'Warehouse Management',
    subtitle: 'Track inventory, stock movement, and shipments in real time. Improve accuracy and warehouse efficiency.',
  },
  {
    imageSource: require('../../assets/images/ERP.png'),
    title: 'Customised ERP Solutions',
    subtitle: 'Get ERP software built around your business. Flexible, scalable, and fully integrated for smooth operations.',
  },
  {
    imageSource: require('../../assets/images/SchoolManagement.png'),
    title: 'School Management ',
    subtitle: 'Manage attendance, grades, and communication — all in one platform. Smart tools for schools that simplify daily tasks.',
  },
];

const TOTAL_PAGES = PAGES.length;
const ScreenHeight = Dimensions.get('window').height;
const ScreenWidth = Dimensions.get('window').width;
export default function WelcomeScreen() {
  const navigation = useNavigation<any>();
  // State to track the current onboarding page index
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const flatListRef = useRef<FlatList<any> | null>(null);

  // --- Hardware Back Button Handler ---
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        // Exit the app when back button is pressed on the onboarding screen
        BackHandler.exitApp();
        return true;
      },
    );
    return () => backHandler.remove(); // Cleanup the event listener
  }, []);

  // --- Navigation Handlers ---
  const handleStart = () => {
    navigation.navigate("Login");
  };

  const handleNext = () => {
    if (currentPageIndex < TOTAL_PAGES - 1) {
      const nextIndex = currentPageIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentPageIndex(nextIndex);
    }
  };

  // --- Custom Components (Recreated) ---

  // Customized DOT indicator
  const DotComponent = ({ index }: { index: number }) => {
    const selected = index === currentPageIndex;
    return (
      <TouchableHighlight
        underlayColor={'transparent'}
        onPress={() => {
          setCurrentPageIndex(index);
          flatListRef.current?.scrollToIndex({ index, animated: true });
        }}
        key={index}
        style={styles.dotcomponent}
      >
        <View
          style={[
            styles.dotsub,
            selected ? { backgroundColor: '#008541' } : {},
          ]}
        />
      </TouchableHighlight>
    );
  };

  // Customized DONE/START button
  const DoneButtonComponent = () => {
    return (
      <View style={{ width: '100%' }}>
        <TouchableHighlight
          style={styles.nextbtn}
          underlayColor={'#007a2a'}
          onPress={handleStart}
        >
          <Text style={styles.nextbtntxt}>Get Started</Text>
        </TouchableHighlight>
      </View>
    );
  };

  // Customized NEXT button
  const NextButtonComponent = () => {
    return (
      <View style={{ width: '100%' }}>
        <TouchableHighlight
          style={styles.nextbtn}
          underlayColor={'#007a2a'}
          onPress={handleNext}
        >
          <Text style={styles.nextbtntxt}>Next</Text>
        </TouchableHighlight>
      </View>
    );
  };

  // --- Main Render Logic ---
  const currentPage = PAGES[currentPageIndex];
  const isLastPage = currentPageIndex === TOTAL_PAGES - 1;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>

      {!isLastPage && (
        <View style={styles.skipBar}>
          <TouchableOpacity onPress={handleStart}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Current Onboarding Content (Swipeable) */}
      <View style={{ flex: 1, justifyContent: 'flex-start' }}>
        <FlatList
          ref={flatListRef}
          data={PAGES}
          keyExtractor={(_, index) => index.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center' }}
          getItemLayout={(_, index) => ({ length: ScreenWidth, offset: ScreenWidth * index, index })}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / ScreenWidth);
            setCurrentPageIndex(index);
          }}
          renderItem={({ item }) => (
            <View style={{ width: ScreenWidth, height: ScreenHeight - (ScreenHeight * 0.1 + 10), paddingHorizontal: scaleFont(20), alignItems: 'center', justifyContent: 'center' }}>
              <Image style={styles.image} source={item.imageSource} />
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
            </View>
          )}
        />
      </View>

      {/* Bottom Bar (Dots and Buttons) */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingVertical: 10,
          marginBottom: 10,
        }}
      >
        {/* Dots Indicator */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 30 }}>
          {PAGES.map((_, index) => (
            <DotComponent key={index} index={index} />
          ))}
        </View>

        {/* Next/Done Button */}
        {isLastPage ? <DoneButtonComponent /> : <NextButtonComponent />}
      </View>
    </View>
  );
}