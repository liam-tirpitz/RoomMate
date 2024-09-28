#include "Screen.h"

UBYTE *BlackImage;

void Screen::setup() {
    DEV_Module_Init();
    EPD_7IN5_V2_Init();
    EPD_7IN5_V2_Clear();
    DEV_Delay_ms(500);

    UWORD Imagesize = ((EPD_7IN5_V2_WIDTH % 8 == 0) ? (EPD_7IN5_V2_WIDTH / 8 ) : (EPD_7IN5_V2_WIDTH / 8 + 1)) * EPD_7IN5_V2_HEIGHT;
    if ((BlackImage = (UBYTE *)malloc(Imagesize)) == NULL) {
        printf("Failed to apply for black memory...\r\n");
        while (1);
    }
    printf("Paint_NewImage\r\n");
    Paint_NewImage(BlackImage, EPD_7IN5_V2_WIDTH, EPD_7IN5_V2_HEIGHT, 0, WHITE);
    Paint_SetRotate(90);

    // EPD_7IN5_V2_Init_Fast();  
    // printf("SelectImage:BlackImage\r\n");
    Paint_SelectImage(BlackImage);
    Paint_Clear(WHITE);

}


void Screen::printThings() {
  Paint_DrawString_EN(10, 0, "Test", &Font24, WHITE, BLACK);
//   Paint_DrawString_EN(10, 30, ",", &Font24, WHITE, BLACK);


  printf("EPD_Display\r\n");
  EPD_7IN5_V2_Display(BlackImage);
//   DEV_Delay_ms(2000);
//   EPD_7IN5_V2_Sleep();
}