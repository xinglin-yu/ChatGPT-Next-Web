import React, { useState, useEffect, useMemo, HTMLProps, useRef } from "react";

import styles_settings from "../components/settings.module.scss";
import styles_user from "./user.module.scss";

import { List, ListItem, showToast } from "../components/ui-lib";
import Locale from "../locales";

import { IconButton } from "../components/button";

import { ErrorBoundary } from "../components/error";
import { useNavigate } from "react-router-dom";
import { UserInfoWindowHeader } from "./user-common";
import QRCode from "qrcode.react";

import zBotServiceClient, {
  UserCheckResultVO,
  UserRequestInfoVO,
  UserConstantVO,
  LocalStorageKeys,
  UserOrderVO,
} from "../zbotservice/ZBotServiceClient";

// 放到这里, 方便修改
const pricingPackage = [
  { amount: 10, base_coins: 100, requests: 100 },
  { amount: 30, base_coins: 500, requests: 500 },
  { amount: 60, base_coins: 2000, requests: 2000 },
];

export function UserOrder() {
  const navigate = useNavigate();

  let userEmail = localStorage.getItem(LocalStorageKeys.userEmail) as string;

  return (
    <ErrorBoundary>
      <div>
        {" "}
        {UserInfoWindowHeader(
          navigate,
          Locale.Settings.UserBalance.BalanceCenter.Title,
        )}{" "}
      </div>

      <div className={styles_settings["settings"]}>
        {UserbalanceInfo(userEmail)}
      </div>
    </ErrorBoundary>
  );
}

function UserbalanceInfo(userEmail: string) {
  const [userRequestInfoVO, setuserRequestInfoVO] = useState(
    new UserRequestInfoVO(),
  );
  zBotServiceClient.getRequestInfo(userEmail).then((item) => {
    setuserRequestInfoVO(item);
  });

  const [userConstantVO, setUserConstantVO] = useState(new UserConstantVO());
  zBotServiceClient.getConstant().then((item) => {
    setUserConstantVO(item);
  });

  const toSignin = async (email: string) => {
    try {
      const result = await zBotServiceClient.signin(email);
      if (result === UserCheckResultVO.success) {
        showToast(
          Locale.Settings.UserBalance.BalanceCenter.SignState.SignToast.Success,
        );
      } else if (result === UserCheckResultVO.notFound) {
        showToast(
          Locale.Settings.UserBalance.BalanceCenter.SignState.SignToast
            .NotRegister,
        );
      } else if (result === UserCheckResultVO.Signined) {
        showToast(
          Locale.Settings.UserBalance.BalanceCenter.SignState.SignToast
            .HasSigned,
        );
      } else {
        showToast(
          Locale.Settings.UserBalance.BalanceCenter.SignState.SignToast.Failed,
        );
      }
    } catch (error) {
      console.log("db access failed:"), error;
    }
  };

  return (
    <List>
      <ListItem
        title={Locale.Settings.UserBalance.BalanceCenter.AccountBalance.Title}
      ></ListItem>
      <div className={styles_user["user-order-balance"]}>
        <div className={styles_user["user-order-balance-item"]}>
          <div className={styles_user["user-order-balance-num"]}>
            {userRequestInfoVO.baseCoins}
          </div>
          <div className={styles_user["user-order-balance-title"]}>
            {
              Locale.Settings.UserBalance.BalanceCenter.AccountBalance.BaseCoins
                .Title
            }
          </div>
          {/* <div>
            {
              Locale.Settings.UserBalance.BalanceCenter.AccountBalance.BaseCoins
                .SubTitle
            }
          </div> */}
        </div>
        <div className={styles_user["user-order-balance-item"]}>
          <div className={styles_user["user-order-balance-num"]}>
            {userRequestInfoVO.thisDayCoins}
          </div>
          <div className={styles_user["user-order-balance-title"]}>
            {
              Locale.Settings.UserBalance.BalanceCenter.AccountBalance
                .LimitCoins.Title
            }
          </div>
          <div>
            {
              Locale.Settings.UserBalance.BalanceCenter.AccountBalance
                .LimitCoins.SubTitle
            }
          </div>
        </div>
        <div className={styles_user["user-order-balance-item"]}>
          <div className={styles_user["user-order-balance-num"]}>
            {userRequestInfoVO.totalRequests}
          </div>
          <div className={styles_user["user-order-balance-title"]}>
            {
              Locale.Settings.UserBalance.BalanceCenter.AccountBalance
                .TotalDialogs.Title
            }
          </div>
          {/* <div>
            {
              Locale.Settings.UserBalance.BalanceCenter.AccountBalance
                .TotalDialogs.SubTitle
            }
          </div> */}
        </div>
        <div className={styles_user["user-order-balance-item"]}>
          <div className={styles_user["user-order-balance-num"]}>
            {userRequestInfoVO.totalSigninDays}
          </div>
          <div className={styles_user["user-order-balance-title"]}>
            {
              Locale.Settings.UserBalance.BalanceCenter.AccountBalance
                .TotalSignDays.Title
            }
          </div>
          <div>
            {Locale.Settings.UserBalance.BalanceCenter.AccountBalance.TotalSignDays.SubTitle(
              userConstantVO.dayBaseCoins,
              userConstantVO.dayLimitCoins,
            )}
          </div>
        </div>
      </div>

      {userRequestInfoVO.isThisDaySignin ? (
        <ListItem
          title={
            Locale.Settings.UserBalance.BalanceCenter.SignState.Signed.Title
          }
        >
          <label className={styles_user["user-order-signed"]}>
            {Locale.Settings.UserBalance.BalanceCenter.SignState.Signed.State}
          </label>
          <IconButton text={""} bordered disabled />
        </ListItem>
      ) : (
        <ListItem
          title={
            Locale.Settings.UserBalance.BalanceCenter.SignState.NotSigned.Title
          }
        >
          <label className={styles_user["user-order-unsigned"]}>
            {
              Locale.Settings.UserBalance.BalanceCenter.SignState.NotSigned
                .State
            }
          </label>
          <IconButton
            text={
              Locale.Settings.UserBalance.BalanceCenter.SignState.NotSigned
                .Button
            }
            bordered
            onClick={() => toSignin(userEmail)}
          />
        </ListItem>
      )}
    </List>
  );
}
