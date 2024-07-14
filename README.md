# A Bluetooth-Based Indoor Asset Tracking System 
The Bluetooth-Based Indoor Asset Tracking System is a project designed for real-time tracking of assets within an indoor environment. The system utilizes a combination of stationary ESP32 devices and a mobile ESP32. The mobile ESP32 continuously broadcasts Bluetooth signals, and the four stationary ESP32 devices receive the RSSI (Received Signal Strength Indicator) signals of the mobile ESP32.The received RSSI signals are then transmitted over Wi-Fi to a Node.js server. The Node.js server is responsible for processing the received signals, performing triangulation, and conducting calculations to determine the real-time position of the mobile ESP32. This position information is then visualized on a web page, providing users with an intuitive and dynamic display of the asset's location within the indoor space.The system offers a practical solution for tracking assets in environments where GPS signals may not be reliable or available. With the use of Bluetooth technology, Wi-Fi communication, and triangulation algorithms, this project ensures accurate and real-time asset tracking, enhancing the overall efficiency of asset management within indoor spaces.

Live Demo video : https://www.youtube.com/watch?v=e7PcS4lu5Og
