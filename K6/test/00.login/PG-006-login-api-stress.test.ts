import http from "k6/http"
import {check, sleep} from "k6"
import exec, {test} from "k6/execution"
import { Options } from "k6/options"

const BASE_URL='https://api.demoblaze.com'

export const options: Options = {
    
}