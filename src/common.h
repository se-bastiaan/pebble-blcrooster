typedef struct {
        char value1[24];
        char value2[24];
        char value3[24];
        int index;
} RoosterItem;

enum {
        REFRESH = 0x0,
        VALUE1 = 0x1,
        VALUE2 = 0x2,
        VALUE3 = 0x3,
        INDEX = 0x4,
        ERROR = 0x5,
        USER_ID = 0x6,
        LOAD = 0x7
};
