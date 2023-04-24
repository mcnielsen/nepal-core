/**
 * This function will help us to get the client timezone offset in the HH:MM format
 **/
export function getUserTimezone(): string {
    let convertToTwoDigits = (number: number): string => {
        return (number < 10? '0' : '') + number.toString();
    };
    let offset: number = new Date().getTimezoneOffset();
    const minusSignIndex: number = offset.toString().indexOf('-');
    let offsetSign: string = '-';
    if (minusSignIndex > -1) {
        offsetSign = '+';
        offset = -1 * offset;
    }
    const minutes: number = offset % 60;
    const hours: number = (offset - minutes) / 60;
    const offsetHHMMFormat: string = offsetSign + convertToTwoDigits(hours) + ":" + convertToTwoDigits(minutes);

    return offsetHHMMFormat;
}
