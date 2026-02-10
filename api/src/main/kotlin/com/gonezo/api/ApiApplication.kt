package com.gonezo.api

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication(scanBasePackages = ["com.gonezo"])
class ApiApplication

fun main(args: Array<String>) {
  runApplication<ApiApplication>(*args)
}
