// 2013 Thomas Hunsaker @thunsaker (original code for Spoon)
// 2013 Sébastiaan Versteeg
// Heavily modified version of Neal's Hacker News list implementation - https://github.com/Neal/pebble-hackernews

#pragma once

void roosterlist_init(void);
void roosterlist_show();
void roosterlist_destroy(void);
void roosterlist_in_received_handler(DictionaryIterator *iter);
bool roosterlist_is_on_top();
int roosterlist_day();
void roosterlist_get(int day, bool refresh);
