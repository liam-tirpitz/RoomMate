#include "Screen.h"

UBYTE *BlackImage;

UWORD Imagesize = ((SCREEN_WIDTH % 8 == 0) ? (SCREEN_WIDTH / 8 ) : (SCREEN_WIDTH / 8 + 1)) * SCREEN_HEIGHT;

Screen::Screen(FooterState* footer_state) : footer_state(footer_state) {};

void Screen::setup() {
    pinMode(12, OUTPUT);
    digitalWrite(12, HIGH);
    DEV_Module_Init();
    EPD_7IN5_V2_Init();
    DEV_Delay_ms(200);
    if ((BlackImage = (UBYTE *)malloc(Imagesize)) == NULL) {
        printf("Failed to apply for black memory...\r\n");
        while (1);
    }
    Paint_NewImage(BlackImage, SCREEN_WIDTH, SCREEN_HEIGHT, 0, WHITE);
    Paint_SelectImage(BlackImage);
    Paint_SetRotate(90);
    Paint_Clear(WHITE);
}

void Screen::drawImage(unsigned char *output) {
    Paint_DrawBitMap(output);
    EPD_7IN5_V2_Display(BlackImage);
      DEV_Delay_ms(2000);
}



void Screen::draw() {
    Paint_Clear(WHITE);
    draw_footer();
    EPD_7IN5_V2_Display(BlackImage);
}

void Screen::draw_footer() {
    Paint_DrawRectangle(FOOTER_X_START, FOOTER_Y_START, SCREEN_WIDTH-2, SCREEN_HEIGHT-2, BLACK, DOT_PIXEL_2X2, DRAW_FILL_EMPTY);
    Paint_DrawString_EN(FOOTER_X(70), FOOTER_Y(20), "Hallo Welt!", &Font16, WHITE, BLACK);
}

void Screen::sleep() {
    EPD_7IN5_V2_Sleep();
    digitalWrite(12, LOW);
}
