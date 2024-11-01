#ifndef PROVISIONER_H
#define PROVISIONER_H


#include <Arduino.h>
#include <ESP32Console.h>
#include "ESP32Console/Helpers/PWDHelpers.h"
#include <Storage.h>
#include <WiFi.h>


using namespace ESP32Console; 




class Provisioner
{
	public:
	Provisioner();
		void setup();
	
	private:
		Storage storage;

};

#endif

