#include "DEV_Config.h"
#include "EPD.h"
#include "GUI_Paint.h"
#include <stdlib.h>

#define SCREEN_HEIGHT EPD_7IN5_V2_HEIGHT
#define SCREEN_WIDTH EPD_7IN5_V2_WIDTH

#define FOOTER_Y_START 700
#define FOOTER_X_START 0
#define FOOTER_X(x) FOOTER_X_START+x 
#define FOOTER_Y(y) FOOTER_Y_START+y


struct FooterState {
	short last_updated_hour;
	short last_updated_minute;
};


class Screen
{
	public:
	Screen(FooterState* footer_state);
	void setup();

	void draw();
	void drawImage(unsigned char *output);	
    void drawNewDeviceImage(const char *device_id);
	void sleep();
	
	private:
	void draw_footer();
	FooterState* footer_state;
};

