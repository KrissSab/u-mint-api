import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
class IsCryptoWalletConstraint implements ValidatorConstraintInterface {
  validate(wallet: string): boolean {
    const cryptoWalletAddressRegexes = {
      eth: /^0x[a-fA-F0-9]{40}$/, // Ethereum
      sol: /^[1-9A-HJ-NP-Za-km-z]{43,44}$/, // Solana
      trx: /^T[a-zA-Z0-9]{33}$/, // Tron
      bsc: /^0x[a-fA-F0-9]{40}$/, // Binance Smart Chain
      polygon: /^0x[a-fA-F0-9]{40}$/, //Polygon
    };
    return Object.values(cryptoWalletAddressRegexes).some(regex =>
      regex.test(wallet),
    );
  }
  defaultMessage(validationArguments?: ValidationArguments): string {
    return 'Wallet address is not valid for any supported cryptocurrency (BSC, ETH, Polygon, SOL, TRX, DOT).';
  }
}

/**
 * Checks if the string is SOL, ETH, TRX, Polygon or BSC wallet
 * @param validationOptions
 * @returns
 */

export function IsCryptoWallet(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsCryptoWalletConstraint,
    });
  };
}
