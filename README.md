# Room-Occupancy

Room-Occupancy provides digital e-ink signs for offices and bookable resources, such as meeting rooms.
For meeting rooms, it displays the current availability (occupied / available), as well as a list of upcoming meetings.
For offices, it displays up to two names and affiliations, as well as potential out-of-office notices.
This project was developed for the infrastructure at RWTH Aachen University, but is configurable to other scenarios.


We currently support room calendars accessible through Microsoft Exchange and published as ical via RWTHOnline.
The calendar information is accessed through a nodejs server component.
The client consists of an eink screen and an esp32 board.
The screen content is processed on the server.
The client regularly requests the server via WiFi and HTTP and updates the screen content.






## Getting started






## Installation

## Usage


### Configuration

## Server

## Client

### Hardware
The hardware of the client consists of a 3D printed case and the electronics.

#### Electronics

The electronics of the client consist of the following components:
For details, see the [Bill of Material](./hardware/bom.xlsx)

- EInk-Display (7.5 inch, 800x400 black/white module with driver HAT [from Waveshare](https://www.waveshare.com/7.5inch-e-paper-hat.htm))
- ESP32-Microcontroller Development Board ([Adafruit ESP32 Feather V2](https://www.adafruit.com/product/5400))
- 3700 mAh LiPo Battery

The driver HAT connects the E-Ink display to the Microcontroller.
The Feather has built-in LiPo support and directly connects to the battery.
![Hardware Wiring](documentation/images/hardware.jpg)

#### Wiring 
The output from the e-ink HAT need to be soldered to the Feather board, according to the following pinout.
The used pins are defined in [DEV_Config.h](./client/room-occupancy/Room-Occupancy-Client/lib/esp32-waveshare-epd/src/DEV_Config.h)

| E-Ink | Feather   |
|-------|-----------|
| PWR   | 12        |
| BUSY  | 32        |
| RST   | 27        |
| DC    | 33        |
| CS    | 15        |
| CLK   | 5 (SCK)   |
| DIN   | 19 (MOSI) |
| GND   | GND       |
| VCC   | 3V        |



#### Case
The case consists of three parts.
The front cover holds and exposes the eink display, the middle part holds the electronics and the battery and
the backplate holds everything in place and provides mounting holes for hanging the device.
The case was designed in Fusion 360.
We provide the [Fusion project files](./hardware/case/fusion_project_files) and exported [STEP files](./hardware/case/step-files).
In our deployment, we print the case on a Prusa MK4 3D printer with [Prusament PLA in Galaxy Black](https://www.prusa3d.com/de/produkt/prusament-pla-prusa-galaxy-black-1kg/).

![Hardware Wiring](documentation/images/case.jpg)



### Software
