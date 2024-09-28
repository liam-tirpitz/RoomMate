#include "DEV_Config.h"
#include "EPD.h"
#include "GUI_Paint.h"
#include <stdlib.h>
#include "imagedata.h"

class Screen
{
	public:
	void setup();

	//set functions
	void printThings();
	
	private:
	
	int month;
	int year; 
};