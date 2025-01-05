import { Controller, Get, Ip, Req } from "@nestjs/common";
import { Request } from "express";
@Controller("app")
export class AppController {
  @Get()
  info(): string {
    return "Deer customer! \n Welcome to U-Mint-API!";
  }
}
