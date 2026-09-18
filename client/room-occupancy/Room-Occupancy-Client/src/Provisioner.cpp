#include "Provisioner.h"

Console console;


int getWifiMAC(int argc, char **argv)
{
    String devid = WiFi.macAddress();


    printf((devid + "\n").c_str());
    
    return EXIT_SUCCESS;

}

int setWifiCredentials(int argc, char **argv)
{
    //Ensure that we have an argument to parse
    if (argc != 3)
    {
        printf("You have to give the WiFi Credentials as the argument: wifi.setCredetials SSID PSK\n");
        
        //Return EXIT_FAILURE if something did not worked.
        return EXIT_FAILURE;
    }
    Storage storage;

    //Take the first argument...
    auto ssid = String(argv[1]);
    storage.setSSID(ssid);
    auto psk = String(argv[2]);
    storage.setPSK(psk);


  //  printf(storage.getPSK().c_str());
  //  printf(storage.getSSID().c_str());

    printf("Credentials saved\n");
    
    //Return EXIT_SUCCESS if everything worked as intended.
    return EXIT_SUCCESS;
}

int setEndpoint(int argc, char **argv)
{
    if (argc != 2)
    {
        printf("You have to give the Endpoint as the argument: config.setEndpoint http://server.com:3001\n");
        return EXIT_FAILURE;
    }
    Storage storage;

    auto endpoint = String(argv[1]);
    // The firmware appends "data?devid=..." directly, so the endpoint has to end with a slash
    if (!endpoint.endsWith("/")) {
        endpoint += "/";
    }
    storage.setEndpoint(endpoint);

    printf("Endpoint saved\n");
    
    return EXIT_SUCCESS;
}


int setSleepInterval(int argc, char **argv)
{
    if (argc != 2)
    {
        printf("You have to give the wakeup intervall in seconds: config.setRegularWakeupInterval 900\n");
        return EXIT_FAILURE;
    }
    Storage storage;

    auto arg = atoi(argv[1]);
    // A zero or negative interval would make the device wake up continuously and drain the battery
    if (arg < MIN_SLEEP_TIME_IN_S || arg > MAX_SLEEP_TIME_IN_S) {
        printf("The interval has to be between %d and %d seconds\n", MIN_SLEEP_TIME_IN_S, MAX_SLEEP_TIME_IN_S);
        return EXIT_FAILURE;
    }
    storage.setRegularSleepTimeInS(arg);

    printf("Wakeup Interval saved\n");
    printf("%d s \n", arg);
    
    return EXIT_SUCCESS;
}

Provisioner::Provisioner() {
    console.setPrompt("RoomMate> ");
    console.begin(115200);
    console.registerSystemCommands();
    console.registerCommand(ConsoleCommand("wifi.setCredentials", &setWifiCredentials, "Set WiFi Credentials"));
    console.registerCommand(ConsoleCommand("wifi.getMAC", &getWifiMAC, "Get MAC Address"));
    console.registerCommand(ConsoleCommand("config.setEndpoint", &setEndpoint, "Set HTTP-Endpoint"));
    console.registerCommand(ConsoleCommand("config.setSleepInterval", &setSleepInterval, "Set Sleep Interval in Seconds"));

    printf("\n\nWelcome to RoomMate!");


};

