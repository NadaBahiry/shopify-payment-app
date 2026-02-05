<?php

namespace Src;

use Dotenv\Dotenv;

class Config
{
    private static bool $loaded = false;

    public static function load(): void
    {
        if (self::$loaded) {
            return;
        }
        $path = dirname(__DIR__);
        if (file_exists($path . '/.env')) {
            $dotenv = Dotenv::createImmutable($path);
            $dotenv->safeLoad();
        }
        self::$loaded = true;
    }

    public static function get(string $key, string $default = ''): string
    {
        self::load();
        $value = $_ENV[$key] ?? getenv($key);
        return $value !== false ? (string) $value : $default;
    }
}
